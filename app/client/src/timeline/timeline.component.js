let _ = require('lodash');
let $ = require('jquery');

let moment = require('moment');
let WatchJS = require('watchjs');
let watch = WatchJS.watch;
let unwatch = WatchJS.unwatch;

const behaviorMarkers = require('./markers.js');
let relTime = require('./relative-time.js');
let range = require('../core/range.js');
let timezoneOffsetMillis = relTime.timezoneOffsetMillis;
let defaultPlotOptions = require('../core/plotdefaults.js');
let events = require('../session-vis/events.js');
const thresholds = require('./thresholds.conf.js');

const BEHAVIOR_Y = 0;

// The y-value at which to plot all elements of a special trace which shows the
// index of the current timepoint
const POINT_RESOLUTION_TRACE_Y = 0;

// A vertical line will be drawn at 50% of the plot
const DATA_FOCUS_POSITION = 0.5;

// The amount of milliseconds to add to imagingDelay such that when a
// MOVE_FORWARD or MOVE_BACKWARD event is handled, there is no chance of
// accidentally focusing on the same point twice.
const PERIOD_SAFETY_NET = 5;

let ctrlDef = ['$http', '$window', '$scope', 'session', 'traceManager', function TimelineController($http, $window, $scope, session, traceManager) {
    let $ctrl = this;

    // Wait for a parent component (i.e. session-vis) to send the session
    // metadata through an event. Immediately unsubscribe.
    let unsubscribe = $scope.$on(events.META_LOADED, (event, data) => {
        unsubscribe();
        $scope.$emit(events.META_RECEIVED);
        init(data);
    });

    let plotNode = $('#plot-timeline')[0];

    let sessionId = null;
    let lastFocusIndex = null;
    // The amount of milliseconds between each imaging event rounded up, plus
    // PERIOD_SAFETY_NET
    let imagingDelay = null;

    let init = function(data) {
        $ctrl.sessionMeta = data.metadata;
        sessionId = $ctrl.sessionMeta._id;

        // volRate is in Hertz. Convert this frequency to time period by taking
        // Math.pow(volRate, -1) and convert to milliseconds by multiplying by
        // 1000
        imagingDelay = Math.round(
            ((1 / $ctrl.sessionMeta.volRate) * 1000) + PERIOD_SAFETY_NET
        );

        traceManager.onResolutionChanged = (newRes) => {
            $scope.$emit(events.SIBLING_NOTIF, {
                type: events.RESOLUTION_CHANGED,
                data: newRes
            });
        };

        traceManager.init({
            plotNode: plotNode,
            sessionId: sessionId,
            sessionFrequency: $ctrl.sessionMeta.volRate,
            relTimes: $ctrl.sessionMeta.relTimes,
            colors: data.colors,
            thresholds: thresholds
        });

        return initBehavior()
        .then(initPointIdentifierTrace)
        .then(registerCallbacks)
        .then(function() {
            // Emit a DATA_FOCUS_CHANGE event with high priority so that volume
            // will get some initial data
            emitDataFocusChange($ctrl.sessionMeta.relTimes.length * DATA_FOCUS_POSITION);
            // Tell the parent scope (i.e. session-vis) that we've finished
            // initializing
            $scope.$emit(events.INITIALIZED, plotNode);
        });
    };

    /**
     * Initializes a brand-new plot for the timeline. Returns a Promise.
     */
    let initPlot = function() {
        let timeId = 'Create empty timeline';
        console.time(timeId);

        let fluorGraphStart = 0.25;

        // Simple layout data
        let layout = {
            // yaxis is for fluorescence data
            yaxis: {
                // Goes 25% to 100% of the element (where 0% is the bottom and
                // 100% is the top)
                domain: [fluorGraphStart, 1.0],
                title: 'Fluorescence'
            },
            // yaxis2 is for behavior data
            yaxis2: {
                // Goes from 10% to 20% of the element
                domain: [0.1, 0.2],
                // We don't care about the y-values, only x-values
                showticklabels: false,
                // Don't allow the user to accidentally move the data out of
                // sight through zooming/panning
                fixedrange: true
            },
            xaxis: {
                title: 'Time',
                tickformat: '%-Hh %-Mm %-S.%3fs' // 0h 4m 3.241s
            },
            font: {
                family: 'Roboto, sans-serif'
            },
            shapes: [{
                type: 'line',
                xref: 'paper',
                yref: 'paper',
                x0: DATA_FOCUS_POSITION,
                x1: DATA_FOCUS_POSITION,
                y0: fluorGraphStart,
                y1: 1,
                line: {
                    color: 'red',
                    width: 1.5
                }
            }],
            margin: {
                t: 20,
                r: 20,
                b: 80,
                l: 40
            },
            showlegend: true
        };

        return Plotly.newPlot(plotNode, [], layout, defaultPlotOptions).then(function() {
            console.timeEnd(timeId);
        });
    };

    /**
     * Creates a trace whose sole purpose is to show the user the index of the
     * timepoint their cursor is under.
     */
    let initPointIdentifierTrace = function() {
        const trace = {
            // Convert every relative time to a Date for the x-axis
            x: _.map($ctrl.sessionMeta.relTimes, t => new Date(relTime.relativeMillis(t))),
            // This trace is a straight line modeled by the function
            //     y = POINT_RESOLUTION_TRACE_Y
            y: _.fill(Array($ctrl.sessionMeta.relTimes.length), POINT_RESOLUTION_TRACE_Y),
            // Map every index to a string
            text: _.map(_.range(0, $ctrl.sessionMeta.nSamples - 1), i => 'Point ' + i),
            // Only show the 'text' on hover, which will be the value of the
            // text array (specified above) at any given index
            hoverinfo: 'text',
            // Set the opacity to 0 so the users can't see it, but can still see
            // the effects of hovering over it
            opacity: 0,
            name: 'Point Identifier',
            legendgroup: 'Special',
            line: { color: 'black' }
        };

        return Plotly.addTraces(plotNode, trace);
    };

    /**
     * Fetches and graphs behavior data from the API
     * @return {Promise} A Promise with no result to allow for chaining
     */
    let initBehavior = function() {
        let timeId = 'Create behavior traces and plot';
        console.time(timeId);

        return session.behavior(sessionId).then(function(behaviorData) {
            behaviorData = behaviorData.data.data;
            let traces = [];

            let startDelta = Date.now();

            // behaviorData is an object mapping event types to the index of the
            // relative position at which the event occurred
            for (let name of Object.keys(behaviorData)) {
                let behaviorIndexes = behaviorData[name];

                let marker = behaviorMarkers[name];

                traces.push({
                    x: _.map(behaviorIndexes, index => new Date(relTime.relativeMillis($ctrl.sessionMeta.relTimes[index]))),
                    y: _.fill(Array(behaviorIndexes.length), BEHAVIOR_Y),
                    name: name,
                    type: 'scatter',
                    mode: 'markers',
                    yaxis: 'y2', // Plot this on y-axis 2 (bottom subplot)
                    hoverinfo: 'skip', // change to 'none' if hover events become necessary
                    marker: marker,
                    legendgroup: 'Behavior'
                });
            }

            return Plotly.addTraces(plotNode, traces).then(function() {
                console.timeEnd(timeId);
            });
        });
    };

    /**
     * Registers callbacks on the timeline node that are only available after
     * plotting.
     */
    let registerCallbacks = function() {
        plotNode.on('plotly_relayout', function(evt) {
            // plotly_relayout events also fired when the pan, zoom, lasso, etc.
            // buttons are clicked as well as when the graph viewport changes

            let domainMillis;

            if (evt['xaxis.autorange'] && evt['xaxis.autorange'] === true) {
                // User has reset axes (at least the x-axis). The domain is the
                // entire experiment, from 0 ms to the very last relative time
                // (converted to milliseconds)
                domainMillis = range.create(0,
                    $ctrl.sessionMeta.relTimes[$ctrl.sessionMeta.nSamples - 1] * 1000);

                // Show the middle point again
                emitDataFocusChange($ctrl.sessionMeta.relTimes.length * DATA_FOCUS_POSITION);
            } else if (evt['xaxis.range[0]']) {
                // Zooming/panning around gives definitive ranges.

                const startMillis = new Date(evt['xaxis.range[0]']).getTime() - timezoneOffsetMillis;
                const endMillis = new Date(evt['xaxis.range[1]']).getTime() - timezoneOffsetMillis;
                domainMillis = range.create(startMillis, endMillis);

                // Update the 3D figure
                onTimepointSelected(domainMillis.start + DATA_FOCUS_POSITION * (domainMillis.end - domainMillis.start));
            } else if (evt['xaxis.range']) {
                // Plotly usually sends the range update in two properties,
                // `xaxis.range[0]` and `xaxis.range[1]`. However, it may be
                // specified as an array with `xaxis.range`. In this case,
                // the 0th and 1st element are a number representing the time
                // in milliseconds of the start and end of the domain
                // respectively. These types of events only originate from our
                // code, specifically from shiftViewportX()
                domainMillis = range.create(
                    evt['xaxis.range'][0],
                    evt['xaxis.range'][1]
                );
            }

            if (domainMillis !== undefined) {
                traceManager.onDomainChange(domainMillis.start, domainMillis.end);
            }
        });

        // Single mask being toggled
        $scope.$on(events.MASK_TOGGLED, (event, mask) => {
            if (mask.enabled) enableTraces(mask);
            else disableTraces(mask);
        });

        // Multiple masks being toggled
        $scope.$on(events.TOGGLE_ALL, (event, data) => {
            if (data.mode === 'enable') enableTraces(data.masks);
            else disableTraces(data.masks);
        });

        let onXaxisRangeChange = (prop, action, newValue, oldValue) => {
            // Sometimes we are given an invalid range
            if (typeof newValue === 'string') return;

            let millisecondValue = _.map(newValue, x => new Date(x).getTime() - timezoneOffsetMillis);
            let middleMillis = millisecondValue[0] +
                ((millisecondValue[1] - millisecondValue[0]) * DATA_FOCUS_POSITION);

            // When this function is called as a result of plotNode._dragging
            // being true (the user is dragging around the timeline),
            // highPriority will always be false.
            onTimepointSelected(middleMillis);
        };

        // Watch the '_dragging' property of the plot node. When true, the user
        // is dragging the timeline around.
        watch(plotNode, '_dragging', (prop, action, newValue, oldValue) => {
            if (newValue) {
                // The user has started dragging, watch the xaxis property
                // maintained by Plotly so that we can emit DATA_FOCUS_CHANGE
                // events to the volume component
                watch(plotNode._fullLayout.xaxis, 'range', onXaxisRangeChange);
            } else {
                // The user is no longer dragging so we don't care about the
                // x-axis range anymore
                unwatch(plotNode._fullLayout.xaxis, 'range', onXaxisRangeChange);
            }
        });

        // Move the x-axis viewport by ~1 index when the user presses the left
        // or right arrow key
        $scope.$on(events.MOVE_FORWARD, () =>  { shiftViewportX(1);  });
        $scope.$on(events.MOVE_BACKWARD, () => { shiftViewportX(-1); });
    };

    let shiftViewportX = function(indexCount) {
        const shiftMillis = indexCount * imagingDelay;

        // plotNode.(...).range is a date string parsable by the Date function.
        // Parse these strings with moment and add the shift amount
        let newDomain = _.map(plotNode._fullLayout.xaxis.range,
            r => moment(r).add(shiftMillis, 'milliseconds').valueOf());

        return Plotly.relayout(plotNode, {
            'xaxis.range': newDomain
        });
    };

    let enableTraces = function(masks) {
        if (!Array.isArray(masks)) masks = [masks];
        return traceManager.putTraces(masks);
    };

    let disableTraces = function(masks) {
        if (!Array.isArray(masks)) masks = [masks];
        return traceManager.removeTraces(masks);
    };

    /**
     * Converts newMillis into an index and calls `emitDataFocusChange` with
     * that index.
     *
     * @param  {number}  newMillis
     * @param  {Boolean} [isHighPriority=false] If this event should be treated
     *                                          with high priority. What that
     *                                          actually means is really up to
     *                                          whatever component receives this
     *                                          event (e.g. volume)
     */
    let onTimepointSelected = function(newMillis) {
        let newIndex;
        // Manually set newIndex to 0 when newMillis < 0 because relTime.toIndex
        // returns a minimum of 1
        if (newMillis < 0)
            newIndex = 0;
        else
            // Add 1 to adjust for some small error that always understates the
            // actual value of the new index
            newIndex = relTime.toIndex($ctrl.sessionMeta.relTimes, newMillis) + 1;

        // Check bounds
        if (newIndex < 0) newIndex = 0;
        if (newIndex > $ctrl.sessionMeta.relTimes.length - 1)
            newIndex = $ctrl.sessionMeta.relTimes.length - 1;

        emitDataFocusChange(newIndex);
    };

    /**
     * Emits an event of type events.SIBLING_NOTIF. The contents of
     * the event data are the sanitized parameters to this function
     *
     * @param  {number}  newIndex
     */
    let emitDataFocusChange = function(newIndex) {
        // Tell the parent scope (i.e. session-vis) that the user has selected a
        // timepoint to analyze. In this case, that timepoint is at the location
        // at which the vertical line is drawn. Prefer Math.ceil over Math.floor
        // because floor()'ing the index tends to push the index naturally leans
        // to the left. Using ceil corrects this such that newIndex will only be
        // at maximum 1 or 2 indexes from the "true" value.
        const actualIndex = Math.ceil(newIndex);

        // Prevent sending more than 1 of the same event in a row
        if (lastFocusIndex === actualIndex) return;

        $scope.$emit(events.SIBLING_NOTIF, {
            // We want the parent to send this type of event to our siblings
            type: events.DATA_FOCUS_CHANGE,
            data: actualIndex
        });
        lastFocusIndex = actualIndex;
    };

    // Initialize only empty graph
    initPlot();
}];

module.exports = {
    templateUrl: '/partial/timeline',
    controller: ctrlDef
};
