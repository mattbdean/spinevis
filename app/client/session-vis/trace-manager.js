let _ = require('lodash');
let uuid = require('uuid');
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
     *                        `resolution` and `visibleDomain`. `resolution` is
     *                        an integer from 1-100 that defines what percentage
     *                        of the raw data that should be shown.
     *                        `visibleDomain` is the duration in milliseconds
     *                        between the start of the visible domain (x-axis)
     *                        and the end of the visible domain. Leave Infinity
     *                        for entire domain.
     */
    constructor($http, plotNode, sessionId, sessionStart, relTimes, thresholds) {
        this.session = sessionGenerator($http);
        this.plotNode = plotNode;
        this.sessionId = sessionId;
        this.sessionStart = sessionStart;
        this.relTimes = relTimes;
        this.thresholds = _.orderBy(thresholds, ['visibleDomain'], ['desc']);

        this.bufferMult = DEFAULT_BUFFER_MULT;
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
            emptyCacheMap[threshold.visibleDomain] = {
                start: null,
                end: null,
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

        if (!hasInitialData(this.traces, newThreshold)) {
            return requestFreshTraces(this.session, this.sessionId, this.relTimes, newThreshold.resolution, startIndex, endIndex, this.bufferMult)
            .then(function(result) {
                let freshTraceNames = Object.keys(result.traces);
                for (let freshTraceName of freshTraceNames) {

                    self.traces[freshTraceName].variations[newThreshold.visibleDomain] = {
                        start: result.start,
                        end: result.size,
                        complete: result.start === 0 && result.size === self.relTimes.length,
                        resolution: newThreshold.resolution
                    };
                    self.traces[freshTraceName].variations[newThreshold.visibleDomain].trace = createTrace(
                        /*uuid = */self.traces[freshTraceName].uuid,
                        /*name = */self.traces[freshTraceName].displayName,
                        /*sessionStart = */self.sessionStart,
                        /*relTimes = */self.relTimes,
                        /*fluorData = */self.traces[freshTraceName].fullRes,
                        /*indexes = */result.traces[freshTraceName],
                        /*offset = */result.start
                    );
                }

                applyThreshold(self.plotNode, self.traces, newThreshold);
            });
        } else {
            applyThreshold(self.plotNode, self.traces, newThreshold);
        }
    }

}

let hasInitialData = function(traces, threshold) {
    let firstTrace = traces[Object.keys(traces)[0]];
    // Check if the first variation (the largest threshold and therefore the
    // one that is filled when init() is called) has trace data
    return firstTrace.variations[threshold.visibleDomain].trace !== null;
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
    return _.map([startMillis, endMillis], millis => inexactBinarySearch(relTimes, millis / 1000));
}

let requestFreshTraces = function(session, sessionId, relTimes, resolution, startIndex, endIndex, bufferMult) {
    return session.timeline(sessionId, resolution, startIndex, endIndex, bufferMult).then(function(response) {
        return response.data.data;
    });
};

let applyThreshold = function(plotNode, traces, threshold) {
    let traceNames = Object.keys(traces);
    for (let traceName of traceNames) {

        let trace = traces[traceName];
        let variation = trace.variations[threshold.visibleDomain].trace;

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

let createTrace = function(uuid, name, sessionStart, relTimes, fluorData, indexes, offset = 0) {
    // Create outline
    let trace = {
        x: [],
        y: [],
        type: 'scatter',
        uid: uuid,
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
};

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
