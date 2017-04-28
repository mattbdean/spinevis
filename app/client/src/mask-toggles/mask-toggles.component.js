let _ = require('lodash');
let events = require('../session-vis/events.js');
let tinycolor = require('tinycolor2');

let ctrlDef = ['$scope', '$http', 'session', function($scope, $http, session) {
    let $ctrl = this;

    $scope.$on(events.META_LOADED, (event, data) => {
        // Expose the color mapping to the controller so that we can reference
        // it in the view
        $ctrl.colors = data.colors;

        $ctrl.masks = [];
        for (let mask of data.masks) {
            let m = _.clone(mask);
            m.enabled = false;
            $ctrl.masks.push(m);
        }
    });

    $scope.$on(events.MASK_CLICKED, (event, mask) => {
        // Update our mask data here
        let maskIndex = _.findIndex($ctrl.masks, m => m.codeName === mask.codeName);
        let localMask = $ctrl.masks[maskIndex];
        localMask.enabled = !localMask.enabled;

        // Notify siblings that the mask has been toggled
        $ctrl.toggled(localMask);

        // This fixes an issue where toggles don't show that they are disabled
        // when they actually are
        $scope.$apply();
    });

    $ctrl.toggled = function(mask) {
        $scope.$emit(events.SIBLING_NOTIF, {
            type: events.MASK_TOGGLED,
            data: mask
        });
    };

    let setAllEnabled = function(enabled) {
        for (let mask of $ctrl.masks) {
            mask.enabled = enabled;
        }
    };

    $ctrl.toggleAll = function() {
        let disabled = _.filter($ctrl.masks, m => !m.enabled);
        let enabled = _.filter($ctrl.masks, m => m.enabled);
        let mode = 'enable';
        let selectedMasks;

        // Enable any disabled masks
        if (disabled.length > 0) {
            selectedMasks = disabled;
        } else if (enabled.length === $ctrl.masks.length) {
            // Only disable if all masks are enabled
            mode = 'disable';
            selectedMasks = enabled;
        }

        setAllEnabled(mode === 'enable');
        $scope.$emit(events.SIBLING_NOTIF, {
            type: events.TOGGLE_ALL,
            data: {
                mode: mode,
                masks: selectedMasks
            }
        });
    };
}];

module.exports = {
    templateUrl: '/partial/mask-toggles',
    controller: ctrlDef
};
