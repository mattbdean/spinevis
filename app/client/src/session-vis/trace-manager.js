let _ = require('lodash');
let uuid = require('uuid');
let range = require('./range.js');
let Downsampler = require('./downsampler.js');
let sessionGenerator = require('../core/session.js');
let relTime = require('./relative-time.js');
// let Plotly = require('plotly');

/** One unit of padding is equal to 5% of the treshold's normalized visibleDomain */
const PADDING_RATIO = 0.05;
/** The start/end of the domain is within 100% of the visible domain */
const PADDING_THRESH_MULT = 1;
/** Add 500% the visible domain once that threshold is crossed */
const PADDING_ADD_MULT = 3;

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
    constructor($http, plotNode, sessionId, sessionStart, sessionFrequency, relTimes, thresholds) {
        this.session = sessionGenerator($http);
        this.plotNode = plotNode;
        this.sessionId = sessionId;
        this.sessionStart = sessionStart;
        this.relTimes = relTimes;
        this.thresholds = _.orderBy(thresholds, ['visibleDomain'], ['desc']);

        // Assign each threshold a fixed padding width
        for (let i = 0; i < this.thresholds.length; i++) {
            let t = this.thresholds[i];
            // No padding if the visible domain is Infinity, otherwise normalize
            // the padding widths by dividing by the frequency at which the
            // recordings were taken
            this.thresholds[i].paddingUnit = t.visibleDomain === Infinity ? 0 :
                    Math.floor((t.visibleDomain / sessionFrequency) * PADDING_RATIO);
        }

        this.downsampler = new Downsampler(this.session, this.sessionId, this.relTimes);
        this.traces = {};
        this.currentThresh = null;
        this.absoluteBounds = range.create(0, this.relTimes.length - 1);
    }

    init() {
        // Assume the whole domain is visible
        this.currentThresh = identifyThresh(Infinity, this.thresholds);
        this.displayRange = range.copy(this.absoluteBounds);
        this.minimumBounds = range.copy(this.absoluteBounds);
        this.onDomainChange(0, Infinity);
    }

    putTrace(codeName, displayName, index = Object.keys(this.traces).length) {
        // Allocate a variable location for each resolution
        let emptyData = {};
        for (let thresh of this.thresholds) {
            emptyData[thresh.resolution] = {};
        }

        // Register the trace
        this.traces[codeName] = {
            index: index,
            displayName: displayName,
            downsampled: emptyData,
            uuid: uuid.v4(),
            fullRes: null // placeholder
        };

        let self = this;
        return this.downsampler.process(codeName, _.map(this.thresholds, t => t.resolution)).then(function(data) {
            self.traces[codeName].downsampled = data.downsampled;
            self.traces[codeName].fullRes = data.fullRes;
            displayNewTrace(self.plotNode, self.traces[codeName], self.displayRange, self.currentThresh, self.relTimes);
        }).catch(function(err) {
            throw err;
        })
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

        let newThreshold = identifyThresh(endMillis - startMillis, this.thresholds);
        // Convert start and end times into indexes
        let [startIndex, endIndex] = _.map([startMillis, endMillis], t => relTime.toIndex(this.relTimes, t));

        let paddingMultSize = newThreshold.paddingUnit * PADDING_ADD_MULT;

        if (newThreshold.resolution === this.currentThresh.resolution) {
            // Same resolution, expand the trace.
            let paddingThreshSize = this.currentThresh.paddingUnit * PADDING_THRESH_MULT;

            // If the visible range does not completely encompass this range,
            // add more data
            let minimumBounds = range.create(
                this.displayRange.start + paddingThreshSize,
                this.displayRange.end - paddingThreshSize
            );

            let visibleBoundsToUser = range.create(startIndex, endIndex);

            if (!range.contained(minimumBounds, visibleBoundsToUser)) {
                // Add new data, determine whether to append or prepend

                let additionRange = visibleBoundsToUser.start < minimumBounds.start ?
                    // prepend
                    range.create(
                        this.displayRange.start - paddingMultSize,
                        this.displayRange.start
                    ) :
                    // append
                    range.create(
                        this.displayRange.end,
                        this.displayRange.end + paddingMultSize
                    );

                for (let codeName of Object.keys(this.traces)) {
                    addDataToTrace(this.plotNode, this.traces[codeName], additionRange, this.currentThresh, this.relTimes);
                }

                if (additionRange.start === this.displayRange.end) {
                    this.displayRange.end = additionRange.end;
                } else if (additionRange.end === this.displayRange.start) {
                    this.displayRange.start = additionRange.start;
                }
            }
        } else {
            // Different resolution, create new traces
            let displayRange = range.create(startIndex - paddingMultSize, endIndex + paddingMultSize);
            this.displayRange = range.boundBy(displayRange, this.absoluteBounds);
            this.currentThresh = newThreshold;
            for (let codeName of Object.keys(this.traces)) {
                displayNewTrace(this.plotNode, this.traces[codeName], this.displayRange, this.currentThresh, this.relTimes);
            }
        }
    }
}

let displayNewTrace = function(plotNode, traceData, displayRange, currentThresh, relTimes) {
    let computedData = createCoordinateData(traceData, displayRange, currentThresh, relTimes);

    let trace = {
        x: computedData.x,
        y: computedData.y,
        type: 'scatter',
        uid: traceData.uuid,
        name: traceData.displayName
    };

    // Delete the trace if it already exists
    let existingIndex = _.findIndex(plotNode.data, d => d.uid === traceData.uuid);
    if (existingIndex >= 0) {
        Plotly.deleteTraces(plotNode, existingIndex);
    }

    // Add the trace
    Plotly.addTraces(plotNode, trace, traceData.index);
}

let addDataToTrace = function(plotNode, traceData, range, currentThresh, relTimes) {
    let computedData = createCoordinateData(traceData, range, currentThresh, relTimes);
    Plotly.extendTraces(plotNode, {x: [computedData.x], y: [computedData.y]}, [traceData.index]);
}

let createCoordinateData = function(traceData, displayRange, threshold, relTimes) {
    let variation = traceData.downsampled[threshold.resolution];
    let x = [], y = [];
    let offset = displayRange.start;

    if (variation.x && variation.y) {
        // The downsampler was able to prepare x- and y-axis data for this
        // threshold. Only happens when the threshold resolution is 100%

        // Access only a portion of the data and assign it to only a portion
        // of the arrays
        for (let i = 0; i < displayRange.end - displayRange.start; i++) {
            x[i + offset] = variation.x[i + offset];
            y[i + offset] = variation.y[i + offset];
        }
    } else {
        // Fall back on variation.indexes
        let indexes = variation.indexes;

        let offset = displayRange.start;
        let end = Math.min(displayRange.end, indexes.length);

        // Selectively add data to the arrays like above
        for (let i = 0; i < end; i++) {
            let adjustedIndex = indexes[i] + offset;
            x[i + offset] = new Date(relTime.relativeMillis(relTimes[adjustedIndex]));
            y[i + offset] = traceData.fullRes[adjustedIndex];
        }
    }

    return {x: x, y: y};
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
