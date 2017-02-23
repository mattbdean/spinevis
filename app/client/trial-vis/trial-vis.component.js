let moment = require('moment');
require('moment-duration-format');

let ctrlDef = ['$http', '$window', function TrialVisController($http, $window) {
    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.trialId === undefined)
        throw new ReferenceError('Expecting trialId to be injected via $window');
    $ctrl.trialId = $window.trialId;

    /**
     * Calculates the difference in minutes between start and end, where both
     * parameters are an ISO-formatted time string.
     */
    let calculateDifference = function(start, end) {
        let diffInMillis = new Date(end).getTime() - new Date(start).getTime();
        let diffInMinutes = diffInMillis / (60 * 1000);
        return moment.duration(diffInMinutes, "minutes").format();
    };

    $http.get('/api/v1/trial/' + $ctrl.trialId).then(function(result) {
        // result is an XHR response, result.data is our JSON data, including
        // response metadata, result.data.data is the ACTUAL data
        $ctrl.trialMeta = result.data.data;

        // Grab specific elements from the trial metadata to display at the top
        $ctrl.trialFormattedMeta = {
            Run: $ctrl.trialMeta.Run,
            Animal: $ctrl.trialMeta.Animal,
            ["Start time"]: $ctrl.trialMeta.start_time,
            Length: calculateDifference($ctrl.trialMeta.start_time, $ctrl.trialMeta.end_time)
        };
        console.log($ctrl.trialMeta);
    });
}];

module.exports = {
    templateUrl: '/partial/trial-vis',
    controller: ctrlDef
};
