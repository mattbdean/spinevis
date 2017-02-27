let moment = require('moment');
require('moment-duration-format');

let util = require('../core/util.js');

const plotlyDateTimeFormat = 'YYYY-MM-DD h:mm:ss.SSS';

// TODO Use JSPM to require plotly. Currently Plotly is added through a <script>
// let Plotly = require('plotly/plotly.js');

let ctrlDef = ['$http', '$window', function SessionVisController($http, $window) {
    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.sessionId === undefined)
        throw new ReferenceError('Expecting sessionId to be injected via $window');
    $ctrl.sessionId = $window.sessionId;

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

        graphTimeline($ctrl.sessionMeta.start_time,
            $ctrl.sessionMeta.relTimes,
            $ctrl.sessionMeta.globalTC);
    });

    let graphTimeline = function(start, relTimes, fluorData) {
        // Create timeline outline
        let trace = {
            x: [],
            y: [],
            type: 'line'
        };

        // Simple layout data
        let layout = {
            yaxis: {
                title: 'Fluorescence'
            },
            xaxis: {
                title: 'Time',
                tickformat: '%-Hh %-Mm %-S.%3fs' // 0h 4m 3.241s
            }
        };

        let startDelta = Date.now();

        // In order to get Plotly to display a date on the x-axis, we assume
        // our time series data starts at unix time 0 (Jan 1 1970). Doing this
        // is the least computationally expensive starting position for showing
        // relative times. I like to think of it less as a "hack" and more of
        // a "workaround."

        // Plotly assumes input dates are in UTC, adjust for timezone offset
        let timezoneOffsetMillis = new Date().getTimezoneOffset() * 60 * 1000;

        // Fill in the trace data with timeline data. relTimes.length should be
        // equal to fluorData.length.
        for (let i = 0; i < relTimes.length; i++) {
            // relTimes[i] is in seconds, convert to millis and add timezone offset
            trace.x[i] = new Date(relTimes[i] * 1000 + timezoneOffsetMillis);
            trace.y[i] = fluorData[i];
        }

        Plotly.newPlot('plot-timeline', [trace], layout);
        let delta = Date.now() - startDelta;
        console.log('Created timeline traces and plotted in ' + (delta / 1000) + ' seconds');
    };
}];

module.exports = {
    templateUrl: '/partial/session-vis',
    controller: ctrlDef
};
