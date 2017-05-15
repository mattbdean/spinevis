const _ = require('lodash');
const events = require('../session-vis/events.js');

const ctrlDef = ['$scope', function($scope) {
    const $ctrl = this;

    $scope.$on(events.META_LOADED, (event, data) => {
        // Expose the color mapping to the controller so that we can reference
        // it in the view
        $ctrl.colors = data.colors;

        $ctrl.masks = [];
        for (let mask of data.masks) {
            // Clone the mask so we don't mess with other components' data
            let m = _.clone(mask);
            // Mask toggles are disabled by default
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

        // A bit of a hack, this fixes an issue where toggles don't show that
        // they are disabled when they actually are
        $scope.$apply();
    });

    /**
     * Emits a MASK_TOGGLED sibling notification with the mask that was toggled
     * as its data .
     */
    $ctrl.toggled = (mask) => {
        $scope.$emit(events.SIBLING_NOTIF, {
            type: events.MASK_TOGGLED,
            data: mask
        });
    };

    /** Enables all masks */
    const setAllEnabled = (enabled) => {
        for (let mask of $ctrl.masks) {
            mask.enabled = enabled;
        }
    };

    /**
     * If there is at least one mask that isn't enabled, the disabled masks will
     * toggle. If all masks are enabled, all masks will be disabled.
     */
    $ctrl.toggleAll = () => {
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
