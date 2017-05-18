const events = require('../session-vis/events.js');
const defaults = require('./defaults.conf.js');

const INSPECT_TIMEPOINT_PADDING = 50;

const ctrlDef = ['$scope', function($scope) {
    const $ctrl = this;

    // The number of samples in the session minus 1
    let maxIndex;

    const makeOpacityControl = (label, defaultValue) => ({
        label: label,
        // Current value lives here
        model: defaultValue,
        options: {
            floor: 0,
            ceil: 99,
            step: 1,
            translate: (value) => value + '%'
        }
    });

    $ctrl.controls = {
        threshold: {
            label: 'Threshold',
            // Current values live here
            model: { lo: defaults.threshold.lo, hi: defaults.threshold.hi },
            options: {
                // Values vary from [-100, 5000], the user can change the min
                // and max value by increments/decrements of 10
                floor: defaults.threshold.absLo,
                ceil: defaults.threshold.absHi,
                step: defaults.threshold.step,
                enforceStep: false
            }
        },
        maskOpacity: makeOpacityControl('Mask Opacity', defaults.maskOpacity),
        rawDataOpacity: makeOpacityControl('Raw Data Opacity', defaults.rawDataOpacity)
    };

    $ctrl.inspect = () => {
        let point = $ctrl.currentTimepoint;
        if (point < INSPECT_TIMEPOINT_PADDING) point = INSPECT_TIMEPOINT_PADDING;
        if (point > maxIndex - INSPECT_TIMEPOINT_PADDING) point = maxIndex - INSPECT_TIMEPOINT_PADDING;
        // Make sure the user knows that their input has been sanitized
        $ctrl.currentTimepoint = point;

        sendSiblingEvent(events.INSPECT_TIMEPOINT, {
            point: point,
            padding: INSPECT_TIMEPOINT_PADDING
        });
    };

    $scope.$watchCollection('$ctrl.controls.threshold.model', (newVal) => {
        sendSiblingEvent(events.SET_THRESHOLD_RAW_DATA, newVal);
    });

    $scope.$watch('$ctrl.controls.rawDataOpacity.model', (newVal) => {
        sendSiblingEvent(events.SET_OPACITY_RAW_DATA, newVal / 100);
    });

    $scope.$watch('$ctrl.controls.maskOpacity.model', (newVal) => {
        sendSiblingEvent(events.SET_OPACITY_MASKS, newVal / 100);
    });

    const sendSiblingEvent = (type, data) => {
        if (type === undefined || type === null)
            throw new Error('Expected type to exist');

        $scope.$emit(events.SIBLING_NOTIF, {
            // We want the parent to send this type of event
            type: type,
            // The parent will $broadcast an event with this data
            data: data
        });
    };

    $scope.$on(events.RESOLUTION_CHANGED, (event, newRes) => {
        $ctrl.currentResolution = newRes;

        // Make sure AngularJS recieves the update
        setTimeout(() => $scope.$apply(), 0);
    });

    $scope.$on(events.DATA_FOCUS_CHANGE, (event, point) => {
        $ctrl.currentTimepoint = point;
    });

    // Wait for a parent component (i.e. session-vis) to send the session
    // metadata through an event. Immediately unsubscribe.
    const unsubscribe = $scope.$on(events.META_LOADED, (event, data) => {
        unsubscribe();
        maxIndex = data.metadata.nSamples - 1;
        init(data.metadata.threshold);
    });

    const init = (threshold) => {
        // Leave the defaults as is
        if (threshold === undefined) return;

        $ctrl.controls.threshold.model = {
            lo: ensureNumber(threshold, 'min'),
            hi: ensureNumber(threshold, 'max')
        };
        $ctrl.controls.threshold.options = {
            floor: ensureNumber(threshold, 'absMin'),
            ceil: ensureNumber(threshold, 'absMax'),
            step: ensureNumber(threshold, 'step')
        };
    };

    const ensureNumber = (src, propName) => {
        if (typeof src[propName] !== 'number')
            throw new Error(`Expected ${propName} to be a number, was "${src.propName}"`);
        return src[propName];
    };
}];

module.exports = {
    template: require('./visual-settings.template.pug'),
    controller: ctrlDef
};
