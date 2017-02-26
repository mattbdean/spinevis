let moment = require('moment');
require('moment-duration-format');

let util = require('../core/util.js');

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
    });

    $http.get('/api/v1/session/' + $ctrl.sessionId + '/timeline').then(function(result) {
        $ctrl.timelineData = result.data.data;

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
                title: 'Time'
            }
        };

        let start = Date.now();
        // Fill in the trace data with timeline data
        console.log($ctrl.timelineData);
        for (let i = 0; i < $ctrl.timelineData.length; i++) {
            trace.x[i] = i;
            trace.y[i] = $ctrl.timelineData[i];
        }

        Plotly.newPlot('plot-timeline', [trace], layout);
        let delta = Date.now() - start;
        console.log('Created timeline traces and plotted in ' + (delta / 1000) + ' seconds');
    });
}];

module.exports = {
    templateUrl: '/partial/session-vis',
    controller: ctrlDef
};
