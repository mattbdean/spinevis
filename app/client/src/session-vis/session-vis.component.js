let moment = require('moment');
let $ = require('jquery');
let _ = require('lodash');

let tm = require('./trace-manager.js');
let util = require('../core/util.js');
let relTime = require('./relative-time.js');

let TraceManager = tm.TraceManager;
let timezoneOffsetMillis = relTime.timezoneOffsetMillis;

const PLACEHOLDER_ID = '__placeholder__';
const PLACEHOLDER_NAME = 'Add a trace';

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

    $ctrl.placeholderId = PLACEHOLDER_ID;

    /**
     * Registers callbacks on the timeline node that are only available after
     * plotting.
     */
    let registerCallbacks = function() {
        traceManager.init();

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

        session.timeline($ctrl.sessionId).then(function(response) {
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
            putTrace('global');
        });

        $scope.$watch('$ctrl.selectedTrace', function(newValue, oldValue) {
            // newValue is the codeName of the trace, add it only if it is
            // defined, non-null, and not the placeholder
            if (newValue !== undefined && newValue !== null && newValue !== PLACEHOLDER_ID) {
                putTrace(newValue);
            }
        });
    };

    session.get($ctrl.sessionId).then(function(result) {
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

        initTimeline();

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

        // Keep track of the minimum y-axis value
        $ctrl.minGlobalF = _.min($ctrl.sessionMeta.globalTC);
    }).then(function() {
        return $http.get('/conf/plotly/markers.json');
    // }).then(function(markerData) {
    //     $ctrl.markerData = markerData.data;
    //     // Make sure that we have $ctrl.sessionMeta and $ctrl.markerData before
    //     // sending any other HTTP requests that depend on that information
    //     return session.behavior($ctrl.sessionId);
    // }).then(function(result) {
    //     addBehaviorTraces(result.data.data, $ctrl.minGlobalF);
    }).then(registerCallbacks);

    /**
     * Initializes the timeline with no traces
     */
    let initTimeline = function() {
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
    };

    /**
     * Adds behavior data to the timeline
     * @param {object} behaviorData An object whose keys are the name of the
     *                              behavior event and whose values are the
     *                              indexes of the timepoints at which they
     *                              occurred
     * @param {Number} yValue The y-value at which to plot the behavior data
     */
    let addBehaviorTraces = function(behaviorData, yValue) {
        let traces = [];

        let startDelta = Date.now();

        // behaviorData is an object mapping event types to the index of the
        // relative position at which the event occurred
        for (let name of Object.keys(behaviorData)) {
            let behaviorIndexes = behaviorData[name];

            let marker = $ctrl.markerData[name];

            traces.push({
                x: _.map(behaviorIndexes, index => new Date(relativeTime($ctrl.sessionMeta.relTimes[index]))),
                y: _.fill(Array(behaviorIndexes.length), yValue),
                name: name,
                type: 'scatter',
                mode: 'markers',
                hoverinfo: 'skip', // change to 'none' if hover events become necessary
                marker: marker
            });
        }

        Plotly.addTraces(timelineNode, traces);

        let delta = Date.now() - startDelta;
        console.log('Created behavior traces and plotted in ' + (delta / 1000) + ' seconds');
    };

    let putTrace = function(codeName) {
        let traceStructIndex = _.findIndex($ctrl.unaddedTraces, t => t.codeName === codeName);
        // Ensure we only add each trace once
        if (traceStructIndex < 0) {
            console.error(`Attempted to put trace '${codeName}' more than once`);
            return;
        }

        traceManager.putTrace(codeName, $ctrl.availableTraces[codeName]);
        $ctrl.unaddedTraces.splice(traceStructIndex, 1);

        // Initialize with placeholder trace data
        $ctrl.selectedTrace = $ctrl.unaddedTraces[0].codeName;
    };
}];

module.exports = {
    templateUrl: '/partial/session-vis',
    controller: ctrlDef
};
