let moment = require('moment');
require('moment-duration-format');
let $ = require('jquery');
let _ = require('lodash');

let util = require('../core/util.js');

const INITIAL_RESOLUTION = 1; // 1% of all data is shown at start
const FULL_RES_DURATION_THRESH = 5 * 60 * 1000; // Looking at 5 minutes worth of data
const FULL_RESOLUTION = 100;

// TODO Use JSPM to require plotly. Currently Plotly is added through a <script>
// let Plotly = require('plotly/plotly.js');

let ctrlDef = ['$http', '$window', function SessionVisController($http, $window) {
    let $ctrl = this;

    // Fail fast if injection does as well
    if ($window.sessionId === undefined)
        throw new ReferenceError('Expecting sessionId to be injected via $window');
    $ctrl.sessionId = $window.sessionId;

    let timelineNode = $('#plot-timeline')[0];

    /**
     * Creates an array of absolute times that correspond to the given relative
     * times. Relative times are caclulated with the relativeTime function. For
     * each value in relTimes, there will be one value in the returned array
     *
     * @param  {array} relTimes An array of relative times in seconds
     * @return {array}          An array of absolute times
     */
    let createAbsTimeMap = function(relTimes) {
        let map = [];

        for (let relTime of relTimes) {
            map.push(relativeTime(relTime, true));
        }

        return map;
    };

    /**
     * Registers callbacks on the timeline node that are only available after
     * plotting.
     */
    let registerCallbacks = function() {
        timelineNode.on('plotly_relayout', function(evt) {
            if (evt['xaxis.autorange'] && evt['xaxis.autorange'] === true) {
                // User has reset axes (at least the x-axis)
            } else if (evt['xaxis.range[0]']) {
                // Zooming/panning around gives definitive ranges
                let startMillis = new Date(evt['xaxis.range[0]']).getTime() - timezoneOffsetMillis;
                let endMillis = new Date(evt['xaxis.range[1]']).getTime() - timezoneOffsetMillis;

                if (endMillis - startMillis < FULL_RES_DURATION_THRESH) {
                    let startIndex = inexactBinarySearch($ctrl.sessionMeta.relTimes, startMillis / 1000)
                    let endIndex = inexactBinarySearch($ctrl.sessionMeta.relTimes, endMillis / 1000);

                    // TODO call /timeline with start and end
                    replotTimeline($ctrl.sessionId, $ctrl.sessionMeta.start_time, startIndex, endIndex);
                }
            }
            // plotly_relayout events are also fired when the pan, zoom, lasso,
            // etc. buttons are clicked
        });
    };

    let replotTimeline = function(id, sessionStart, rangeStart, rangeEnd, resolution = FULL_RESOLUTION, bufferMult = 2) {
        $http.get(`/api/v1/session/${id}/timeline?resolution=${resolution}&start=${rangeStart}&end=${rangeEnd}&bufferMult=${bufferMult}`).then(function(response) {
            return response.data.data;
        }).then(function(timelineData) {
            console.log(timelineData);
            // Plotly.deleteTraces(timelineNode, 0); // Delete global fluorescence trace
            let globalF = createFluorTrace(
                'Global Fluorescence',
                $ctrl.sessionMeta.start_time,
                $ctrl.sessionMeta.relTimes,
                $ctrl.sessionMeta.globalTC,
                timelineData.traces.global,
                timelineData.start
            );

            Plotly.addTraces(timelineNode, [globalF], 0);
            Plotly.deleteTraces(timelineNode, 1);
        });
    };

    let createFluorTrace = function(name, sessionStart, relTimes, fluorData, indexes, offset = 0) {
        // Create outline
        let trace = {
            x: [],
            y: [],
            type: 'scatter',
            name: name
        };

        // Fill in the trace data with timeline data. relTimes.length should be
        // equal to fluorData.length.
        for (let i = 0; i < indexes.length; i++) {
            let adjustedIndex = indexes[i] + offset;
            trace.x[i] = new Date(relativeTime(relTimes[adjustedIndex]));
            trace.y[i] = fluorData[adjustedIndex];
        }

        return trace;
    }

    /**
     * Performs an inexact binary search to find the index of the element that
     * is closest in value to the item given. Borrowed from
     * http://oli.me.uk/2014/12/17/revisiting-searching-javascript-arrays-with-a-binary-search/
     */
    let inexactBinarySearch = function(list, item) {
        let min = 0;
        let max = list.length - 1;
        let guess;
        let lastGuess;

        while (min <= max) {
            lastGuess = guess;
            guess = Math.floor((min + max) / 2);

            if (list[guess] === item) {
                return guess;
            } else {
                if (list[guess] < item) {
                    min = guess + 1;
                } else {
                    max = guess - 1;
                }
            }
        }

        // A normal binary search would return -1 at this point. However, since
        // we're doing an inexact binary search, we know the value of item
        // is less than list[guess], so return guess - 1
        return guess === 0 ? 0 : guess - 1;
    }

    $http.get('/api/v1/session/' + $ctrl.sessionId).then(function(result) {
        // result is an XHR response, result.data is our JSON data, including
        // response metadata, result.data.data is the ACTUAL data
        $ctrl.sessionMeta = result.data.data;

        // Grab specific elements from the session metadata to display at the top
        $ctrl.sessionFormattedMeta = {
            Run: $ctrl.sessionMeta.Run,
            Animal: $ctrl.sessionMeta.Animal,
            ["Start time"]: $ctrl.sessionMeta.start_time,
            Length: util.formatDifference($ctrl.sessionMeta.start_time, $ctrl.sessionMeta.end_time)
        };

        $ctrl.minGlobalF = _.min($ctrl.sessionMeta.globalTC);

        $ctrl.timeMapping = createAbsTimeMap($ctrl.sessionMeta.relTimes);
    }).then(function() {
        // Get downsampled timeline
        return $http.get('/api/v1/session/' + $ctrl.sessionId + '/timeline?resolution=' + INITIAL_RESOLUTION);
    }).then(function(response) {
        // Plotting only the global trace for now
        let indexes = response.data.data.traces.global;

        return initTimeline($ctrl.sessionMeta.start_time,
            $ctrl.sessionMeta.relTimes,
            $ctrl.sessionMeta.globalTC,
            indexes);
    }).then(function() {
        return $http.get('/conf/plotly/markers.json');
    }).then(function(markerData) {
        $ctrl.markerData = markerData.data;
        // Make sure that we have $ctrl.sessionMeta and $ctrl.markerData before
        // sending any other HTTP requests that depend on that information
        return $http.get('/api/v1/session/' + $ctrl.sessionId + '/behavior');
    }).then(function(result) {
        addBehaviorTraces(result.data.data, $ctrl.minGlobalF);
    }).then(registerCallbacks);

    /**
     * Graphs the global fluorescence data from the session metadata
     * @param  {string} start    ISO date string of the start time
     * @param  {array} relTimes  Each value in the array corresponds to the
     *                           value of the x-axis of a point
     * @param  {array} fluorData Global fluorescence data. Corresponds to values
     *                           on the y-axis
     * @param  {array} indexes   Specific indexes to graph
     */
    let initTimeline = function(start, relTimes, fluorData, indexes) {
        // Simple layout data
        let layout = {
            yaxis: {
                title: 'Fluorescence'
            },
            xaxis: {
                title: 'Time',
                tickformat: '%-Hh %-Mm %-S.%3fs' // 0h 4m 3.241s
            },
            showlegend: true
        };

        let startDelta = Date.now();

        let traces = [createFluorTrace('Global Fluorescence', start, relTimes, fluorData, indexes)]
        Plotly.newPlot(timelineNode, traces, layout);

        let delta = Date.now() - startDelta;
        console.log('Created global fluorescence trace and plotted in ' + (delta / 1000) + ' seconds');
    };

    /**
     * Adds behavior data to the timeline
     * @param {object} behaviorData An object whose keys are the name of the
     *                              behavior event and whose values are the
     *                              indexes of the timepoints at which they
     *                              occurred
     * @param {Number} yValue The y-value at which to plot the behavior data
     */
    let addBehaviorTraces = function(behaviorData, yValue) {
        let traces = [];

        let startDelta = Date.now();

        // behaviorData is an object mapping event types to the index of the
        // relative position at which the event occurred
        for (let name of Object.keys(behaviorData)) {
            let behaviorIndexes = behaviorData[name];

            let marker = $ctrl.markerData[name];

            traces.push({
                x: _.map(behaviorIndexes, index => relativeTime($ctrl.sessionMeta.relTimes[index])),
                y: _.fill(Array(behaviorIndexes.length), yValue),
                name: name,
                type: 'scatter',
                mode: 'markers',
                hoverinfo: 'skip', // change to 'none' if hover events become necessary
                marker: marker
            });
        }

        Plotly.addTraces(timelineNode, traces);

        let delta = Date.now() - startDelta;
        console.log('Created behavior traces and plotted in ' + (delta / 1000) + ' seconds');
    };

    /** Offset in milliseconds of timezone */
    let timezoneOffsetMillis = new Date().getTimezoneOffset() * 60 * 1000;

    /**
     * In order to get Plotly to display a date on the x-axis, we assume our
     * time series data starts at unix time 0 (1 Jan 1970). Doing this is the
     * least computationally expensive starting position for showing relative
     * times. Think of this less as a "hack" and more of a "workaround."
     *
     * N.B. Will not work as expected if relativeSeconds is greater than the
     * amount of seconds in one day
     *
     * @param utc If false, will account for timezone offset
     *
     * @return Unix time at the millisecond resolution that can be plotted and
     *         formatted with a time-only date format to reveal a pseudo-duration
     *         format.
     */
    let relativeTime = function(relativeSeconds, utc = false) {
        // Plotly assumes input dates are in UTC, adjust for timezone offset
        let millis = relativeSeconds * 1000;
        if (!utc) {
            millis += timezoneOffsetMillis;
        }

        return millis;
    };
}];

module.exports = {
    templateUrl: '/partial/session-vis',
    controller: ctrlDef
};
