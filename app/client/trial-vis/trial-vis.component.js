let ctrlDef = ['$http', '$window', function TrialVisController($http, $window) {
    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.trialId === undefined)
        throw new ReferenceError('Expecting trialId to be injected via $window');
    $ctrl.trialId = $window.trialId;
}];

module.exports = {
    templateUrl: '/partial/trial-vis',
    controller: ctrlDef
};
