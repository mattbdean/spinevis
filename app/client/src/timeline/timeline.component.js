let _ = require('lodash');
let $ = require('jquery');

let WatchJS = require('watchjs');
let watch = WatchJS.watch;
let unwatch = WatchJS.unwatch;

const behaviorMarkers = require('./markers.js');
let TraceManager = require('./trace-manager.js');
let relTime = require('./relative-time.js');
let range = require('./range.js');
let timezoneOffsetMillis = relTime.timezoneOffsetMillis;
let sessionApi = require('../core/session.js');
let defaultPlotOptions = require('../core/plotdefaults.js');
let events = require('../session-vis/events.js');

const PLACEHOLDER_ID = '__placeholder__';
const PLACEHOLDER_NAME = 'Add a trace';

const BEHAVIOR_Y = 0;
// A vertical line will be drawn at 50% of the plot
const DATA_FOCUS_POSITION = 0.5;

let ctrlDef = ['$http', '$window', '$scope', function TimelineController($http, $window, $scope) {
    let $ctrl = this;
    let session = sessionApi($http);

    // Wait for a parent component (i.e. session-vis) to send the session
    // metadata through an event. Immediately unsubscribe.
    let unsubscribe = $scope.$on(events.META_LOADED, (event, data) => {
        unsubscribe();
        init(data);
    });

    let plotNode = $('#plot-timeline')[0];

    let traceManager = null;
    let sessionId = null;
    let lastFocusChangeEvent = null;

    let init = function(data) {
        $ctrl.sessionMeta = data;
        sessionId = data._id;

        return initPlot()
        .then(initBehavior)
        .then(initTraces)
        .then(registerCallbacks)
        .then(function() {
            // Emit a DATA_FOCUS_CHANGE event with high priority so that volume
            // will get some initial data
            emitDataFocusChange($ctrl.sessionMeta.relTimes.length * DATA_FOCUS_POSITION, true);
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
            showlegend: true
        };

        // Instantiating is different than init()-ing
        traceManager = new TraceManager(
            /*$http = */$http,
            /*plotNode = */plotNode,
            /*sessionId = */sessionId,
            /*sessionStart = */$ctrl.sessionMeta.start_time,
            /*sessionFrequency = */$ctrl.sessionMeta.volRate,
            /*relTimes = */$ctrl.sessionMeta.relTimes,
            /*thresholds = */[
                {
                    visibleDomain: Infinity,
                    resolution: 1,
                    nick: 'all'
                },
                {
                    visibleDomain: 5 * 60 * 1000, // 5 minutes
                    resolution: 100,
                    nick: '5min'
                }
            ]
        );

        return Plotly.newPlot(plotNode, [], layout, defaultPlotOptions).then(function() {
            console.timeEnd(timeId);
        });
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
                    marker: marker
                });
            }

            return Plotly.addTraces(plotNode, traces).then(function() {
                console.timeEnd(timeId);
            });
        });
    };

    /**
     * Initializes the trace manager, fetches the names of all available traces,
     * and plots the global trace.
     * @return {Promise} A Promise with no result to allow for chaining
     */
    let initTraces = function() {
        let timeId = 'Grab trace names and plot global trace';
        console.time(timeId);
        traceManager.init(timeId);

        return session.timeline(sessionId).then(function(response) {
            $ctrl.availableTraces = {[PLACEHOLDER_ID]: PLACEHOLDER_NAME};
            $ctrl.unaddedTraces = [{codeName: PLACEHOLDER_ID, displayName: PLACEHOLDER_NAME}];

            for (let codeName of response.data.data) {
                let displayName = 'Mask ' + codeName;

                // Override only when needed
                if (codeName === 'global') displayName = 'Global Fluorescence';

                $ctrl.availableTraces[codeName] = displayName;
                $ctrl.unaddedTraces.push({codeName: codeName, displayName: displayName});
            }

            // Define our global trace
            return putTrace('global').then(() => { console.timeEnd(timeId); });
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
                // User has reset axes (at least the x-axis)
                domainMillis = range.create(0, Infinity);
            } else if (evt['xaxis.range[0]']) {
                // Zooming/panning around gives definitive ranges
                startMillis = new Date(evt['xaxis.range[0]']).getTime() - timezoneOffsetMillis;
                endMillis = new Date(evt['xaxis.range[1]']).getTime() - timezoneOffsetMillis;
                domainMillis = range.create(startMillis, endMillis);
            }

            if (domainMillis !== undefined) {
                traceManager.onDomainChange(domainMillis.start, domainMillis.end);

                let selectedIndex = domainMillis.start +
                    (domainMillis.end - domainMillis.start) * DATA_FOCUS_POSITION;

                // User settled on this timepoint, it is high priority
                onTimepointSelected(selectedIndex, true);
            }
        });

        let onXaxisRangeChange = (prop, action, newValue, oldValue) => {
            let millisecondValue = _.map(newValue, x => new Date(x).getTime() - timezoneOffsetMillis);
            let middleMillis = millisecondValue[0] +
                ((millisecondValue[1] - millisecondValue[0]) * DATA_FOCUS_POSITION);

            // A dragging event is low priority
            onTimepointSelected(middleMillis, false);
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
    };

    /**
     * Adds a trace to the TraceManager, which subsequently adds it to the
     * timeline.
     * @param  {string|Number} codeName The name of the trace (e.g. "global", 0,
     *                                  1, etc.)
     * @return {Promise}       The result of traceManager.putTrace()
     */
    let putTrace = function(codeName) {
        let traceStructIndex = _.findIndex($ctrl.unaddedTraces, t => t.codeName === codeName);
        // Ensure we only add each trace once
        if (traceStructIndex < 0) {
            console.error(`Attempted to put trace '${codeName}' more than once`);
            return;
        }

        return traceManager.putTrace(codeName, $ctrl.availableTraces[codeName]).then(function() {
            $ctrl.unaddedTraces.splice(traceStructIndex, 1);

            // Initialize with placeholder trace data
            $ctrl.selectedTrace = $ctrl.unaddedTraces[0].codeName;
        });
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
    let onTimepointSelected = function(newMillis, isHighPriority = false) {
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

        emitDataFocusChange(newIndex, isHighPriority);
    };

    /**
     * Emits an event of type events.DATA_FOCUS_CHANGE_NOTIF. The contents of
     * the event data are the sanitized parameters to this function
     *
     * @param  {number}  newIndex
     * @param  {Boolean} [isHighPriority=false] See onTimepointSelected
     */
    let emitDataFocusChange = function(newIndex, isHighPriority = false) {
        // Tell the parent scope (i.e. session-vis) that the user has selected a
        // timepoint to analyze. In this case, that timepoint is at the location
        // at which the vertical line is drawn. Prefer Math.ceil over Math.floor
        // because floor()'ing the index tends to push the index naturally leans
        // to the left. Using ceil corrects this such that newIndex will only be
        // at maximum 1 or 2 indexes from the "true" value.

        // Prevent sending more than 1 of the same event in a row
        let actualIndex = Math.ceil(newIndex);
        // Ensure value is a boolean
        let actualHighPriority = !!isHighPriority;
        if (lastFocusChangeEvent !== null &&
            lastFocusChangeEvent.index === actualIndex &&
            lastFocusChangeEvent.highPriority === actualHighPriority)
            return;

        let eventData = {
            index: actualIndex,
            highPriority: actualHighPriority
        };

        $scope.$emit(events.DATA_FOCUS_CHANGE_NOTIF, eventData);
        lastFocusChangeEvent = eventData;
    };
}];

module.exports = {
    templateUrl: '/partial/timeline',
    controller: ctrlDef
};
