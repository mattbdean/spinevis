let moment = require('moment');
let $ = require('jquery');
let _ = require('lodash');
let colormap = require('colormap');
let tinycolor = require('tinycolor2');

let events = require('./events.js');
let util = require('../core/util.js');
let defaultPlotOptions = require('../core/plotdefaults.js');

const METADATA_LOADING = '(loading)';

const METADATA_DEFAULTS = {
    Animal: METADATA_LOADING,
    // start_time and end_time are expected to be an ISO 8601-formatted string,
    // like what the API will return. Set these values to the current date.
    start_time: moment().format(),
    end_time: moment().format(),
    Run: METADATA_LOADING,
    name: METADATA_LOADING
};

// TODO Use JSPM to require plotly. Currently Plotly is added through a <script>
// let Plotly = require('plotly/plotly.js');

let ctrlDef = ['$http', '$window', '$scope', 'title', 'session', function SessionVisController($http, $window, $scope, title, session) {
    // Use base title until we get some information
    title.useBase();

    let $ctrl = this;

    // Use a Set to prevent potential excessive calls to Plotly.Plots.resize()
    let plotNodes = new Set();

    let totalComponents = 0;
    let initializedComponents = 0;
    $ctrl.loading = true;

    $scope.$on(events.META_RECEIVED, () => {
        totalComponents++;
    });

    // Watch for events from children scopes (e.g. the timeline component)
    // notifying us that they're finished initializing
    $scope.$on(events.INITIALIZED, (event, plotNode) => {
        if (plotNodes.has(plotNode)) {
            console.error('Attempted to add plot node more than once:');
            console.error(plotNode);
            return;
        }

        plotNodes.add(plotNode);

        if (++initializedComponents === totalComponents) {
            $ctrl.loading = false;
            // Force a digest cycle to ensure Angular knows about this update
            setTimeout(() => { $scope.$apply(); }, 0);
        }
    });

    // A child scope has requested us to send a notification to its sibling
    // scopes
    $scope.$on(events.SIBLING_NOTIF, (event, spec) => {
        // spec.type is a value in events.*
        $scope.$broadcast(spec.type, spec.data);
    });

    // Resize the plots when the window resizes
    $window.onresize = function() {
        let promises = [];
        // I'd normally do this with lodash but it doesn't seem to like Sets
        for (let p of plotNodes)
            promises.push(Plotly.Plots.resize(p));
        return Promise.all(promises);
    };

    // Handle pressing left and right arrow keys to move backwards or forwards
    // by one timepoint
    $window.onkeyup = function(event) {
        if (event.key === 'ArrowRight') {
            $scope.$broadcast(events.MOVE_FORWARD);
        } else if (event.key === 'ArrowLeft') {
            $scope.$broadcast(events.MOVE_BACKWARD);
        }
    };

    /**
     * Bootstraps this component. Written as a function to minimize clutter in
     * controller function definition. Returns a Promise.
     */
    let init = function() {
        // Both plots require session metadata, grab that before creating them
        let metadata;
        return initSessionMeta().then(function(meta) {
            title.set(`${meta.Animal} on ${util.format.dateShort(meta.start_time)}`);
            metadata = meta;

            return session.timeline(meta._id);
        }).then(function(response) {
            let maskColors = createMaskColors(metadata.masks.Pts.length);
            // Specifically make the global trace blue
            maskColors.global = '#1F77B4';

            // Notify all child scopes (e.g. the timeline component) that
            // the session metadata is ready
            $scope.$broadcast(events.META_LOADED, {
                metadata: metadata,
                colors: maskColors,
                masks: createMasksObject(response.data.data)
            });

            // Wait a half second to clear the loading message if we're
            // developing and removed any components that listen for META_LOADED
            // events
            setTimeout(() => {
                if (totalComponents === 0) {
                    $ctrl.loading = false;
                    setTimeout(() => { $scope.$apply(); }, 0);
                }
            }, 500);
        });
    };

    /**
     * Retrives metadata for this session and instantiates traceManager.
     *
     * @return {Promise} A Promise with no result to allow for chaining
     */
    let initSessionMeta = function() {
        return session.get($ctrl.sessionId).then(function(result) {
            // result is an XHR response, result.data is our JSON data, including
            // response metadata, result.data.data is the ACTUAL data
            let metadata = result.data.data;

            // Grab specific elements from the session metadata to display at the top
            $ctrl.sessionFormattedMeta = createFormattedMetadata(metadata);

            return result.data.data;
        });
    };

    let formatName = (name) => name === undefined ? '<no name>' : `"${name}"`;

    /**
     * Creates an array of formatted metadata. `source` should be an object
     * that is similar to the data returned by `GET /api/v1/session/:id`
     *
     * @param  {object} source Object to pull data from
     */
    let createFormattedMetadata = (source) => [
        'Animal ' + source.Animal,
        util.format.dateTime(source.start_time),
        util.format.duration(source.start_time, source.end_time),
        'Run ' + source.Run,
        formatName(source.name)
    ];

    $ctrl.sessionFormattedMeta = createFormattedMetadata(METADATA_DEFAULTS);

    /*
     * Creates `limit` number of colors using `colormap` in 'rgb' format (e.g.
     * "rgb(0,0,0)").
     */
    let createMaskColors = function(limit) {
        if (typeof limit !== "number")
            throw new Error('limit was not a number (was ' + typeof limit + ')');

        return _.shuffle(colormap({
            colormap: 'hsv',
            nshades: limit,
            format: 'rgbaString'
        }));
    };

    let createMasksObject = function(codeNames) {
        return _.map(codeNames, codeName => {
            let displayName = 'Mask ' + codeName;
            if (codeName === 'global')
                displayName = 'Global Fluorescence';

            return {
                displayName: displayName,
                codeName: codeName
            };
        });
    };

    this.$onInit = function() {
        if ($ctrl.sessionId === undefined) {
            throw new Error('Expecting sessionId to be passed as a component attribute');
        }

        // Set this as the title in case an unhandled error occurs when loading
        // the rest of this component
        title.set($ctrl.sessionId);

        // leggo
        init().catch(function(err) {
            $ctrl.criticalError = err.message;
            throw err;
        });
    };
}];

module.exports = {
    templateUrl: '/partial/session-vis',
    controller: ctrlDef,
    bindings: {
        sessionId: '@'
    }
};
