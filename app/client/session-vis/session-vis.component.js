let moment = require('moment');
require('moment-duration-format');
let $ = require('jquery');
let _ = require('lodash');

let util = require('../core/util.js');

const INITIAL_RESOLUTION = 1; // 1% of all data is shown at start

// TODO Use JSPM to require plotly. Currently Plotly is added through a <script>
// let Plotly = require('plotly/plotly.js');

let ctrlDef = ['$http', '$window', function SessionVisController($http, $window) {
    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.sessionId === undefined)
        throw new ReferenceError('Expecting sessionId to be injected via $window');
    $ctrl.sessionId = $window.sessionId;

    let timelineNode = $('#plot-timeline')[0];

    $http.get('/api/v1/session/' + $ctrl.sessionId).then(function(result) {
        // result is an XHR response, result.data is our JSON data, including
        // response metadata, result.data.data is the ACTUAL data
        $ctrl.sessionMeta = result.data.data;

        // Grab specific elements from the session metadata to display at the top
        $ctrl.sessionFormattedMeta = {
            Run: $ctrl.sessionMeta.Run,
            Animal: $ctrl.sessionMeta.Animal,
            ["Start time"]: $ctrl.sessionMeta.start_time,
            Length: util.formatDifference($ctrl.sessionMeta.start_time, $ctrl.sessionMeta.end_time)
        };

        $ctrl.minGlobalF = _.min($ctrl.sessionMeta.globalTC);
    }).then(function() {
        // Get downsampled timeline
        return $http.get('/api/v1/session/' + $ctrl.sessionId + '/timeline?resolution=' + INITIAL_RESOLUTION);
    }).then(function(response) {
        // Plotting only the global trace for now
        let indexes = response.data.data.global;

        return graphTimeline($ctrl.sessionMeta.start_time,
            $ctrl.sessionMeta.relTimes,
            $ctrl.sessionMeta.globalTC,
            indexes)
    }).then(function() {
        return $http.get('/conf/plotly/markers.json');
    }).then(function(markerData) {
        $ctrl.markerData = markerData.data;
        console.log($ctrl.markerData);
        // Make sure that we have $ctrl.sessionMeta and $ctrl.markerData before
        // sending any other HTTP requests that depend on that information
        return $http.get('/api/v1/session/' + $ctrl.sessionId + '/behavior');
    }).then(function(result) {
        addBehaviorTraces(result.data.data, $ctrl.minGlobalF);
    });

    /**
     * Graphs the global fluorescence data from the session metadata
     * @param  {string} start    ISO date string of the start time
     * @param  {array} relTimes  Each value in the array corresponds to the
     *                           value of the x-axis of a point
     * @param  {array} fluorData Global fluorescence data. Corresponds to values
     *                           on the y-axis
     * @param  {array} indexes   Specific indexes to graph
     */
    let graphTimeline = function(start, relTimes, fluorData, indexes) {
        // Create timeline outline
        let trace = {
            x: [],
            y: [],
            type: 'scatter',
            name: 'Global Fluorescence'
        };

        // Simple layout data
        let layout = {
            yaxis: {
                title: 'Fluorescence'
            },
            xaxis: {
                title: 'Time',
                tickformat: '%-Hh %-Mm %-S.%3fs' // 0h 4m 3.241s
            },
            showlegend: true
        };

        let startDelta = Date.now();

        // Fill in the trace data with timeline data. relTimes.length should be
        // equal to fluorData.length.
        for (let i = 0; i < indexes.length; i++) {
            let rawTimelineIndex = indexes[i];
            trace.x[i] = new Date(relativeTime(relTimes[rawTimelineIndex]));
            trace.y[i] = fluorData[rawTimelineIndex];
        }
        // trace.x = _.map(relTimes, time => new Date(relativeTime(time)));
        // trace.y = fluorData;

        Plotly.newPlot(timelineNode, [trace], layout);
        let delta = Date.now() - startDelta;
        console.log('Created global fluorescence trace and plotted in ' + (delta / 1000) + ' seconds');
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
                x: _.map(behaviorIndexes, index => relativeTime($ctrl.sessionMeta.relTimes[index])),
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
    }

    /** Offset in milliseconds of timezone */
    let timezoneOffsetMillis = new Date().getTimezoneOffset() * 60 * 1000;

    /**
     * In order to get Plotly to display a date on the x-axis, we assume our
     * time series data starts at unix time 0 (1 Jan 1970). Doing this is the
     * least computationally expensive starting position for showing relative
     * times. Think of this less as a "hack" and more of a "workaround."
     *
     * N.B. Will not work as expected if relativeSeconds is greater than the
     * amount of seconds in one day
     *
     * @return Unix time at the millisecond resolution that can be plotted and
     *         formatted with a time-only date format to reveal a pseudo-duration
     *         format.
     */
    let relativeTime = function(relativeSeconds) {
        // Plotly assumes input dates are in UTC, adjust for timezone offset
        return (relativeSeconds * 1000) + timezoneOffsetMillis;
    }
}];

module.exports = {
    templateUrl: '/partial/session-vis',
    controller: ctrlDef
};
