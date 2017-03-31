let moment = require('moment');
let $ = require('jquery');
let tab64 = require('hughsk/tab64');
let _ = require('lodash');

let events = require('./events.js');
let util = require('../core/util.js');
let sessionApi = require('../core/session.js');
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

let ctrlDef = ['$http', '$window', '$scope', 'Title', function SessionVisController($http, $window, $scope, Title) {
    // Use base title until we get some information
    Title.useBase();

    let session = sessionApi($http);
    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.sessionId === undefined)
        throw new ReferenceError('Expecting sessionId to be injected via $window');
    $ctrl.sessionId = $window.sessionId;

    // Set this as the title in case an unhandled error occurs when loading
    // the rest of this component
    Title.set($ctrl.sessionId);

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

    $scope.$on(events.DATA_FOCUS_CHANGE_NOTIF, (event, newIndex) => {
        $scope.$broadcast(events.DATA_FOCUS_CHANGE, newIndex);
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
            Title.set(`${meta.Animal} on ${util.format.dateShort(meta.start_time)}`);
            // Notify all child scopes (e.g. the timeline component) that
            // the session metadata is ready
            $scope.$broadcast(events.META_LOADED, meta);
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
            $ctrl.sessionFormattedMeta = createFormattedMetadata(metadata)

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
