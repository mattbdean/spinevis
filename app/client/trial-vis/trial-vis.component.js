let moment = require('moment');
require('moment-duration-format');

let util = require('../core/util.js');

// TODO Use JSPM to require plotly. Currently Plotly is added through a <script>
// let Plotly = require('plotly/plotly.js');

let ctrlDef = ['$http', '$window', function TrialVisController($http, $window) {
    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.trialId === undefined)
        throw new ReferenceError('Expecting trialId to be injected via $window');
    $ctrl.trialId = $window.trialId;

    $http.get('/api/v1/trial/' + $ctrl.trialId).then(function(result) {
        // result is an XHR response, result.data is our JSON data, including
        // response metadata, result.data.data is the ACTUAL data
        $ctrl.trialMeta = result.data.data;

        // Grab specific elements from the trial metadata to display at the top
        $ctrl.trialFormattedMeta = {
            Run: $ctrl.trialMeta.Run,
            Animal: $ctrl.trialMeta.Animal,
            ["Start time"]: $ctrl.trialMeta.start_time,
            Length: util.calculateDifference($ctrl.trialMeta.start_time, $ctrl.trialMeta.end_time)
        };
        console.log($ctrl.trialMeta);
    });

    $http.get('/api/v1/trial/' + $ctrl.trialId + '/timeline').then(function(result) {
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
        for (let i = 0; i < $ctrl.timelineData.length; i++) {
            trace.x[i] = $ctrl.timelineData[i].absTime;
            trace.y[i] = $ctrl.timelineData[i].globalF;
        }

        Plotly.newPlot('plot-timeline', [trace], layout);
        let delta = Date.now() - start;
        console.log('Created timeline traces and plotted in ' + (delta / 1000) + ' seconds');
    });
}];

module.exports = {
    templateUrl: '/partial/trial-vis',
    controller: ctrlDef
};
