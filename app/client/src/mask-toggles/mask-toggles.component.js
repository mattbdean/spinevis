let _ = require('lodash');
let events = require('../session-vis/events.js');
let sessionApi = require('../core/session.js');
let tinycolor = require('tinycolor2');

let ctrlDef = ['$scope', '$http', function($scope, $http) {
    let $ctrl = this;
    let session = sessionApi($http);

    $scope.$on(events.META_LOADED, (event, data) => {
        $ctrl.colors = _.map(data.colors, toRgbaString);
        // Specifically make the global trace blue
        $ctrl.colors.global = '#1F77B4';

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

    /**
     * Transforms an color represented as an array into a color represented as
     * a string
     *
     * @param  {number[]} rgbaArray An array of either 3 or 4 numbers,
     *                              specifying red, blue, green, and optionally
     *                              alpha in that particular order
     * @return {string}             An RGBA string, e.g. 'rgba(0, 0, 0, 1)'
     */
    let toRgbaString = rgbaArray => tinycolor({
        r: rgbaArray[0],
        g: rgbaArray[1],
        b: rgbaArray[2],
        a: rgbaArray[3] || 1,
    }).toRgbString();
}];

module.exports = {
    templateUrl: '/partial/mask-toggles',
    controller: ctrlDef
};
