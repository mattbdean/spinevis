let moment = require('moment');
let $ = require('jquery');
let _ = require('lodash');

let tm = require('./trace-manager.js');
let util = require('../core/util.js');
let relTime = require('./relative-time.js');
const behaviorMarkers = require('./markers.js');

let TraceManager = tm.TraceManager;
let timezoneOffsetMillis = relTime.timezoneOffsetMillis;

const PLACEHOLDER_ID = '__placeholder__';
const PLACEHOLDER_NAME = 'Add a trace';
const BEHAVIOR_Y = -10;

// TODO Use JSPM to require plotly. Currently Plotly is added through a <script>
// let Plotly = require('plotly/plotly.js');

let ctrlDef = ['$http', '$window', '$scope', function SessionVisController($http, $window, $scope) {
    let session = require('../core/session.js')($http);
    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.sessionId === undefined)
        throw new ReferenceError('Expecting sessionId to be injected via $window');
    $ctrl.sessionId = $window.sessionId;

    let timelineNode = $('#plot-timeline')[0];

    let traceManager = null;

    /**
     * Bootstraps this component. Written as a function to minimize clutter in
     * controller function definition.
     */
    let init = function() {
        // Get basic session information
        return initSessionMeta().then(function() {
            // Synchronously create timeline layout
            initTimeline();
            // Initialize behavior and imaging traces
            return Promise.all([initBehavior(BEHAVIOR_Y), initTraces()]);
        }).then(function() {
            // Register some callbacks to provide full functionality to the user
            registerCallbacks();
        });
    }

    /**
     * Retrives metadata for this session and instantiates traceManager.
     *
     * @return {Promise} A Promise with no result to allow for chaining
     */
    let initSessionMeta = function() {
        return session.get($ctrl.sessionId).then(function(result) {
            // result is an XHR response, result.data is our JSON data, including
            // response metadata, result.data.data is the ACTUAL data
            $ctrl.sessionMeta = result.data.data;

            // Grab specific elements from the session metadata to display at the top
            $ctrl.sessionFormattedMeta = [
                'Animal ' + $ctrl.sessionMeta.Animal,
                util.format.dateTime($ctrl.sessionMeta.start_time),
                util.format.duration($ctrl.sessionMeta.start_time, $ctrl.sessionMeta.end_time),
                'Run ' + $ctrl.sessionMeta.Run
            ];

            // Instantiating is different than init()-ing
            traceManager = new TraceManager(
                /*$http = */$http,
                /*plotNode = */timelineNode,
                /*sessionId = */$ctrl.sessionId,
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

        });
    };

    /**
     * Synchronously initializes a brand-new plot for the timeline.
     */
    let initTimeline = function() {
        let timeId = 'Create empty timeline';
        console.time(timeId);

        // Simple layout data
        let layout = {
            yaxis: {
                title: 'Fluorescence'
            },
            xaxis: {
                title: 'Time',
                tickformat: '%-Hh %-Mm %-S.%3fs' // 0h 4m 3.241s
            },
            font: {
                family: 'Roboto, sans-serif'
            },
            showlegend: true
        };

        Plotly.newPlot(timelineNode, [], layout);
        console.timeEnd(timeId);
    };

    /**
     * Fetches and graphs behavior data from the API
     * @param  {Number} yValue The y-value to plot all data events on
     * @return {Promise} A Promise with no result to allow for chaining
     */
    let initBehavior = function(yValue) {
        let timeId = 'Create behavior traces and plot';
        console.time(timeId);

        return session.behavior($ctrl.sessionId).then(function(behaviorData) {
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
                    y: _.fill(Array(behaviorIndexes.length), yValue),
                    name: name,
                    type: 'scatter',
                    mode: 'markers',
                    hoverinfo: 'skip', // change to 'none' if hover events become necessary
                    marker: marker
                });
            }

            Plotly.addTraces(timelineNode, traces);

            console.timeEnd(timeId);
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

        return session.timeline($ctrl.sessionId).then(function(response) {
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
            putTrace('global').then(() => { console.timeEnd(timeId) });
        });
    }

    /**
     * Registers callbacks on the timeline node that are only available after
     * plotting.
     */
    let registerCallbacks = function() {
        timelineNode.on('plotly_relayout', function(evt) {
            if (evt['xaxis.autorange'] && evt['xaxis.autorange'] === true) {
                // User has reset axes (at least the x-axis)
                traceManager.onDomainChange(0, Infinity);
            } else if (evt['xaxis.range[0]']) {
                // Zooming/panning around gives definitive ranges
                let startMillis = new Date(evt['xaxis.range[0]']).getTime() - timezoneOffsetMillis;
                let endMillis = new Date(evt['xaxis.range[1]']).getTime() - timezoneOffsetMillis;

                traceManager.onDomainChange(startMillis, endMillis);
            }
            // plotly_relayout events are also fired when the pan, zoom, lasso,
            // etc. buttons are clicked
        });

        $window.onresize = function() {
            Plotly.Plots.resize(timelineNode);
        };

        $scope.$watch('$ctrl.selectedTrace', function(newValue, oldValue) {
            // newValue is the codeName of the trace, add it only if it is
            // defined, non-null, and not the placeholder
            if (newValue !== undefined && newValue !== null && newValue !== PLACEHOLDER_ID) {
                putTrace(newValue);
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
        let traceStructIndex = _.findIndex($ctrl.unaddedTraces, t => t.codeName == codeName);
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

    // leggo
    init();
}];

module.exports = {
    templateUrl: '/partial/session-vis',
    controller: ctrlDef
};
