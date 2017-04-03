let moment = require('moment');
let $ = require('jquery');
let tab64 = require('hughsk/tab64');
let _ = require('lodash');
let colormap = require('colormap');
let tinycolor = require('tinycolor2');

let events = require('./events.js');
let util = require('../core/util.js');
let defaultPlotOptions = require('../core/plotdefaults.js');

const METADATA_DEFAULTS = {
    Animal: '(loading)',
    // start_time and end_time are expected to be an ISO 8601-formatted string,
    // like what the API will return. Set these values to the current date.
    start_time: moment().format(),
    end_time: moment().format(),
    Run: '(loading)'
};

// TODO Use JSPM to require plotly. Currently Plotly is added through a <script>
// let Plotly = require('plotly/plotly.js');

let ctrlDef = ['$http', '$window', '$scope', 'title', 'session', function SessionVisController($http, $window, $scope, title, session) {
    // Use base title until we get some information
    title.useBase();

    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.sessionId === undefined)
        throw new ReferenceError('Expecting sessionId to be injected via $window');
    $ctrl.sessionId = $window.sessionId;

    // Set this as the title in case an unhandled error occurs when loading
    // the rest of this component
    title.set($ctrl.sessionId);

    // Use a Set to prevent potential excessive calls to Plotly.Plots.resize()
    let plotNodes = new Set();

    // Watch for events from children scopes (e.g. the timeline component)
    // notifying us that they're finished initializing
    $scope.$on(events.INITIALIZED, (event, plotNode) => {
        if (plotNodes.has(plotNode)) {
            console.error('Attempted to add plot node more than once:');
            console.error(plotNode);
            return;
        }

        plotNodes.add(plotNode);
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

    /**
     * Bootstraps this component. Written as a function to minimize clutter in
     * controller function definition. Returns a Promise.
     */
    let init = function() {
        // Both plots require session metadata, grab that before creating them
        return initSessionMeta().then(function(meta) {
            title.set(`${meta.Animal} on ${util.format.dateShort(meta.start_time)}`);

            let maskColors = createMaskColors(meta.masks.Pts.length);
            // Specifically make the global trace blue
            maskColors.global = '#1F77B4';

            // Notify all child scopes (e.g. the timeline component) that
            // the session metadata is ready
            $scope.$broadcast(events.META_LOADED, {
                metadata: meta,
                colors: maskColors
            });
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
        'Run ' + source.Run
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

    // leggo
    init().catch(function(err) {
        $ctrl.criticalError = err.message;
        console.error(err);
    });
}];

module.exports = {
    templateUrl: '/partial/session-vis',
    controller: ctrlDef
};
