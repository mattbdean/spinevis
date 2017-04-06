let _ = require('lodash');
let events = require('../session-vis/events.js');
let defaults = require('./defaults.js');

let ctrlDef = ['$scope', '$timeout', function($scope, $timeout) {
    let $ctrl = this;

    let tabNames = ['Masks', 'Raw data'];
    let controls = {
        threshold: {
            label: 'Threshold',
            // Current values live here, defaults to [30, 400]
            model: defaults.threshold,
            options: {
                // Values vary from [-100, 5000], the user can change the min
                // and max value by increments/decrements of 10
                floor: -100,
                ceil: 5000,
                step: 10
            }
        },
        opacity: {
            label: 'Opacity',
            // Current value lives here, defaults to 80%
            model: defaults.opacity,
            options: {
                floor: 0,
                ceil: 100,
                step: 1,
                translate: (value) => value + '%'
            }
        }
    };

    this.controlSets = _.map(tabNames, (name) => ({
        name: name,
        codeName: name.toUpperCase().replace(' ', '_'),
        controls: _.cloneDeep(controls)
    }));

    for (let i = 0; i < this.controlSets.length; i++) {
        $scope.$watchCollection('$ctrl.controlSets[' + i + '].controls.threshold.model', (newVal, oldVal) => {
            let eventType = 'SET_THRESHOLD_' + $ctrl.controlSets[i].codeName;
            sendSiblingEvent(events[eventType], newVal);
        });

        $scope.$watch('$ctrl.controlSets[' + i + '].controls.opacity.model', (newVal) => {
            let eventType = 'SET_OPACITY_' + $ctrl.controlSets[i].codeName;
            sendSiblingEvent(events[eventType], newVal / 100);
        });
    }

    let sendSiblingEvent = function(type, data) {
        if (type === undefined || type === null)
            throw new Error('Expected type to exist');

        console.log(type, data);
        $scope.$emit(events.SIBLING_NOTIF, {
            // We want the parent to send this type of event
            type: type,
            // The parent will $broadcast an event with this data
            data: data
        });
    };

    // There is a known issue using Angular UI Bootstrap's tabs in conjunction
    // with rz-slider in which slider positions aren't set on load. Broadcast
    // a special event to force all sliders to recalculate view dimensions fixes
    // this.
    this.ensureSliderPositionAccurate = () => {
        $timeout(() => { $scope.$broadcast('reCalcViewDimensions'); });
    };
}];

module.exports = {
    templateUrl: '/partial/visual-settings',
    controller: ctrlDef
};
