let _ = require('lodash');
let events = require('../session-vis/events.js');
let sessionApi = require('../core/session.js');

let ctrlDef = ['$scope', '$http', function($scope, $http) {
    let $ctrl = this;
    let session = sessionApi($http);

    $scope.$on(events.META_LOADED, (event, data) => {
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
}];

module.exports = {
    templateUrl: '/partial/mask-toggles',
    controller: ctrlDef
};
