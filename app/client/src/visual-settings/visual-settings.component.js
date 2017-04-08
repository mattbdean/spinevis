let _ = require('lodash');
let events = require('../session-vis/events.js');
let defaults = require('./defaults.js');

let ctrlDef = ['$scope', '$timeout', function($scope, $timeout) {
    let $ctrl = this;

    $ctrl.controls = {
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
    $scope.$watchCollection('$ctrl.controls.threshold.model', (newVal, oldVal) => {
        sendSiblingEvent(events.SET_THRESHOLD_RAW_DATA, newVal);
    });

    $scope.$watch('$ctrl.controls.opacity.model', (newVal) => {
        sendSiblingEvent(events.SET_OPACITY_RAW_DATA, newVal / 100);
    });

    let sendSiblingEvent = function(type, data) {
        if (type === undefined || type === null)
            throw new Error('Expected type to exist');

        $scope.$emit(events.SIBLING_NOTIF, {
            // We want the parent to send this type of event
            type: type,
            // The parent will $broadcast an event with this data
            data: data
        });
    };
}];

module.exports = {
    templateUrl: '/partial/visual-settings',
    controller: ctrlDef
};
