let _ = require('lodash');
let events = require('../session-vis/events.js');
let tinycolor = require('tinycolor2');

let ctrlDef = ['$scope', '$http', 'session', function($scope, $http, session) {
    let $ctrl = this;

    $scope.$on(events.META_LOADED, (event, data) => {
        $ctrl.colors = data.colors;

        session.timeline(data.metadata._id).then(function(response) {
            // Array of all mask code names, range of [0-n) where n is the
            // number of masks and 'global'
            let codeNames = response.data.data;

            let masks = _.map(codeNames, codeName => {
                let displayName = 'Mask ' + codeName;
                if (codeName === 'global')
                    displayName = 'Global Fluorescence';

                return {
                    displayName: displayName,
                    codeName: codeName,
                    // Disabled by default
                    enabled: false
                };
            });

            // Move the global trace to the top of the list
            let globalIndex = _.findIndex(masks, m => m.codeName === 'global');
            if (globalIndex >= 0) {
                let globalTrace = masks[globalIndex];
                masks.splice(globalIndex, 1);
                masks.unshift(globalTrace);
            }

            $ctrl.masks = masks;
        });
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
