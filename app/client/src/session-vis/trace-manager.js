let _ = require('lodash');
let uuid = require('uuid');
let range = require('../core/range.js');
let sessionGenerator = require('../core/session.js');
// let Plotly = require('plotly');

const DEFAULT_BUFFER_MULT = 2;

module.exports.TraceManager = class TraceManager {
    /**
     * Instantiates a new TraceManager.
     *
     * @param {object} plotNode The HTML element at which the plot is hosted
     * @param {[]} relTimes A list of relative times in seconds. Corresponds to
     *                      the full resolution data for any trace. That is,
     *                      `relTimes[i]` is the amount of seconds into an
     *                      imaging session at which the value of
     *                      `traces.someTrace.fullRes[i]` was captured.
     * @param {[]} thresholds An array containing objects with two properties:
     *                        `resolution` `visibleDomain`, and `nick`.
     *                        `resolution` is an integer from 1-100 that defines
     *                        what percentage of the raw data that should be
     *                        shown. `visibleDomain` is the duration in
     *                        milliseconds between the start of the visible
     *                        domain (x-axis) and the end of the visible domain.
     *                        Leave Infinity for entire domain. `nick` is a
     *                        nickname for the threshold.
     */
    constructor($http, plotNode, sessionId, sessionStart, relTimes, thresholds) {
        this.session = sessionGenerator($http);
        this.plotNode = plotNode;
        this.sessionId = sessionId;
        this.sessionStart = sessionStart;
        this.relTimes = relTimes;
        this.thresholds = _.orderBy(thresholds, ['visibleDomain'], ['desc']);

        this.traces = {};
        this.currentThresh = null;
    }

    init() {
        // Assume the whole domain is visible
        this.currentThresh = identifyThresh(Infinity, this.thresholds);
        this.onDomainChange(0, Infinity);
    }

    putTrace(codeName, displayName, fullResData, index = Object.keys(this.traces).length) {
        // Pre-allocate some data for caching each resolution's data
        let emptyCacheMap = {};
        for (let threshold of this.thresholds) {
            emptyCacheMap[threshold.nick] = {
                ranges: [],
                trace: null,
                complete: false,
                resolution: threshold.resolution
            };
        }

        // Register the trace
        this.traces[codeName] = {
            index: index,
            displayName: displayName,
            fullRes: fullResData,
            variations: emptyCacheMap,
            uuid: uuid.v4()
        };
    }

    /**
     * Tells the TraceManager that the user has changed the domain of the plot.
     * If necessary, a trace at an alternate resolution will be switched out
     * for the current one.
     *
     * @param {string} visibleDomain The duration in milliseconds which across
     *                               the domain (x-axis) that is currently
     *                               visible to the user
     */
    onDomainChange(startMillis, endMillis) {
        let self = this;

        let visibleDomain = endMillis - startMillis;
        let newThreshold = identifyThresh(visibleDomain, this.thresholds);
        let [startIndex, endIndex] = convertDomain(this.relTimes, startMillis, endMillis);

        // Find out what exactly we need to handle the domain change
        let requestRange = determineRequestRange(this.traces, newThreshold, startIndex, endIndex);

        if (requestRange === null) {
            // We already have the required data, make sure there is a change
            // of threshold before we go about wasting resources
            if (newThreshold.visibleDomain !== this.currentThresh.visibleDomain) {
                applyThreshold(this.plotNode, this.traces, newThreshold);
                self.currentThresh = newThreshold;
            }
        } else {
            return requestFreshTraces(this.session, this.sessionId, this.relTimes, newThreshold.resolution, requestRange.start, requestRange.end)
            .then(function(timelineData) {
                let traceNames = Object.keys(timelineData.traces);
                for (let traceName of traceNames) {
                    let prevVariation = self.traces[traceName].variations[newThreshold.nick];

                    let ranges = prevVariation.ranges;
                    ranges.push(range.create(timelineData.start, timelineData.end));
                    ranges = range.merge(ranges);

                    let variation = {
                        ranges: ranges,
                        complete: ranges[0].start === 0 && ranges[0].end === self.relTimes.length - 1,
                        resolution: prevVariation.resolution,
                        trace: createOrUpdateTrace(
                            /*prevTrace = */prevVariation.trace,
                            /*uuid = */self.traces[traceName].uuid,
                            /*name = */self.traces[traceName].displayName,
                            /*sessionStart = */self.sessionStart,
                            /*relTimes = */self.relTimes,
                            /*fluorData = */self.traces[traceName].fullRes,
                            /*indexes = */timelineData.traces[traceName],
                            /*offset = */timelineData.start
                        )
                    };

                    self.traces[traceName].variations[newThreshold.nick] = variation;
                }

                applyThreshold(self.plotNode, self.traces, newThreshold);
                self.currentThresh = newThreshold;
            });
        }
    }
}

/**
 * Tries to determine the best range of data to request at one time from the
 * timeline endpoint. Takes into account existing data ranges
 * @param  {object}  traces      Traces object passed from TraceManager
 * @param  {object}  threshold   The threshold to be tested
 * @param  {Number}  startIndex  Start of visible domain
 * @param  {Number}  endIndex    End of visible domain
 * @return {string}              Returns null if the data is already present.
 *                               Otherwise, returns an object containing a
 *                               numerical start and end property dictating the
 *                               most efficient range of data to request
 */
let determineRequestRange = function(traces, threshold, startIndex, endIndex) {
    let firstTrace = traces[Object.keys(traces)[0]];
    let variation = firstTrace.variations[threshold.nick];

    // We have all data for this variation
    if (variation.complete === true) return null;

    let requestRange = range.create(startIndex, endIndex);

    // TODO There's a smarter way to do this that should be O(log_2(n)) but this
    // is just a proof of concept
    for (let i = 0; i < variation.ranges.length; i++) {
        let r = variation.ranges[i];
        if (range.contained(r, requestRange)) {
            return null;
        }
    }

    // Exclude the data that we already have so nothing gets requested twice
    return range.squeeze(variation.ranges, range.create(startIndex, endIndex));
}

let identifyThresh = function(visibleDomain, thresholds) {
    let thresh = thresholds[0];

    for (let i = 1; i < thresholds.length; i++) {
        if (visibleDomain < thresholds[i].visibleDomain) {
            thresh = thresholds[i];
        }
    }

    return thresh;
};

/**
 * Converts the amount of milliseconds into the session to the approximate
 * (maximum error of 1) index of that timepoint. For example, 0 milliseconds
 * would be converted into the 0th index, 35 millis results in 1 (assuming the
 * session was imaged at ~14 Hz), 106 millis results in 2, etc. Since this
 * conversion is usually done with both the start and end times, this function
 * is made specifically for converting the start and end times (in
 * milliseconds).
 *
 * @param  {array} relTimes An array of relative times whose elements correspond
 *                          to the time (in seconds) at which each imaging event
 *                          occured.
 * @return {array}          An array of length 2, the first element being the
 *                          index that corresponds to the converted start time,
 *                          and the second element being the index for the
 *                          converted end time.
 */
let convertDomain = function(relTimes, startMillis, endMillis) {
    let converted = _.map([startMillis, endMillis], millis => inexactBinarySearch(relTimes, millis / 1000));

    // If inexactBinarySearch cannot find an exact match, it returns 1 less than
    // its last search location. However, we want to override this in case
    // endMillis is Infinity, which means that we want the very last index.
    if (endMillis === Infinity) {
        converted[1] = relTimes.length - 1;
    }

    return converted;
}

let requestFreshTraces = function(session, sessionId, relTimes, resolution, startIndex, endIndex) {
    return session.timeline(sessionId, resolution, startIndex, endIndex).then(function(response) {
        return response.data.data;
    });
};

let applyThreshold = function(plotNode, traces, threshold) {
    let traceNames = Object.keys(traces);
    for (let traceName of traceNames) {

        let trace = traces[traceName];
        let variation = trace.variations[threshold.nick].trace;

        let traceIndex = _.findIndex(plotNode.data, d => d.uid === trace.uuid);
        if (traceIndex === -1) {
            // This trace hasn't been plotted yet
            Plotly.addTraces(plotNode, variation, trace.index);
        } else {
            plotNode.data[traceIndex] = variation;
            Plotly.redraw(plotNode);
        }
    }
}

let createOrUpdateTrace = function(prevTrace, uuid, name, sessionStart, relTimes, fluorData, indexes, offset = 0) {
    let trace = prevTrace;
    if (trace === null) {
        // Create outline
        trace = {
            x: [],
            y: [],
            type: 'scatter',
            uid: uuid,
            name: name
        };
    }

    // Fill in the trace data with timeline data. relTimes.length should be
    // equal to fluorData.length.
    for (let i = 0; i < indexes.length; i++) {
        let adjustedIndex = indexes[i] + offset;
        trace.x[i + offset] = new Date(relativeTime(relTimes[adjustedIndex]));
        trace.y[i + offset] = fluorData[adjustedIndex];
    }

    return trace;
};

/**
 * Performs an inexact binary search to find the index of the element that
 * is closest in value to the item given. Adapted from
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

module.exports.relativeTime = relativeTime;
module.exports.timezoneOffsetMillis = timezoneOffsetMillis;
