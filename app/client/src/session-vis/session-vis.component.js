const Plotly = require('../plotly');
const moment = require('moment');
const _ = require('lodash');
const colormap = require('colormap');

const events = require('./events.js');
const util = require('../core/util.js');

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

const ctrlDef = ['$http', '$window', '$scope', 'title', 'session', function SessionVisController($http, $window, $scope, title, session) {
    // Use base title until we get some information
    title.useBase();

    const $ctrl = this;

    // Use a Set to prevent potential excessive calls to Plotly.Plots.resize()
    const plotNodes = new Set();

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
        const promises = [];
        // I'd normally do this with lodash but it doesn't seem to like Sets
        for (const p of plotNodes)
            promises.push(Plotly.Plots.resize(p));
        return Promise.all(promises);
    };

    /**
     * Bootstraps this component. Written as a function to minimize clutter in
     * controller function definition. Returns a Promise.
     */
    const init = function() {
        // Both plots require session metadata, grab that before creating them
        let metadata;
        return initSessionMeta().then(function(meta) {
            title.set(`${meta.Animal} on ${util.format.dateShort(meta.start_time)}`);
            metadata = meta;

            return session.timeline(meta._id);
        }).then(function(response) {
            const ids = _.map(response.data.data, (d) => d._id);

            // Notify all child scopes (e.g. the timeline component) that
            // the session metadata is ready
            $scope.$broadcast(events.META_LOADED, {
                metadata: metadata,
                colors: createMaskColors(ids),
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
    const initSessionMeta = function() {
        return session.get($ctrl.sessionId).then(function(result) {
            // result is an XHR response, result.data is our JSON data, including
            // response metadata, result.data.data is the ACTUAL data
            const metadata = result.data.data;

            // Grab specific elements from the session metadata to display at the top
            $ctrl.sessionFormattedMeta = createFormattedMetadata(metadata);

            return result.data.data;
        });
    };

    const formatName = (name) => name === undefined ? '<no name>' : `"${name}"`;

    /**
     * Creates an array of formatted metadata. `source` should be an object
     * that is similar to the data returned by `GET /api/v1/session/:id`
     *
     * @param  {object} source Object to pull data from
     */
    const createFormattedMetadata = (source) => [
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
    const createMaskColors = function(traceIds) {
        const colors = _.shuffle(colormap({
            colormap: 'hsv',
            nshades: traceIds.length,
            format: 'rgbaString'
        }));

        const mapping = {};
        for (let i = 0; i < colors.length; i++) {
            mapping[traceIds[i]] = colors[i];
        }

        return mapping;
    };

    const createMasksObject = function(masks) {
        return _.map(masks, (m) => ({
            codeName: m._id,
            displayName: m.maskName
        }));
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
    template: require('./session-vis.template.pug'),
    controller: ctrlDef,
    bindings: {
        sessionId: '@'
    }
};
