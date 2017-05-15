const _ = require('lodash');
const uuid = require('uuid');
const range = require('../core/range.js');
const relTime = require('./relative-time.js');

/** One unit of padding is equal to 10% of the treshold's normalized visibleDomain */
const PADDING_RATIO = 0.1;
/** The start/end of the domain is within 100% of the visible domain */
const PADDING_THRESH_MULT = 1;
/** Add 300% the visible domain once that threshold is crossed */
const PADDING_ADD_MULT = 3;

const serviceDef = ['$http', 'downsampler', function TraceManagerService($http, downsampler) {
    const self = this;

    this.init = (config) => {
        const keysToCopy = ['plotNode', 'sessionId', 'sessionFrequency', 'relTimes', 'colors', 'thresholds'];

        for (const key of keysToCopy) {
            if (config[key] === undefined || config[key] === null)
                throw new Error(`Expecting config.${key} to exist`);
            this[key] = config[key];
        }

        this.traces = {};
        this.thresholds = _.orderBy(this.thresholds, ['visibleDomain'], ['desc']);

        // Initialize our downsampler
        downsampler.init(this.sessionId, this.relTimes);

        // Assign each threshold a fixed padding width
        for (let i = 0; i < this.thresholds.length; i++) {
            const t = this.thresholds[i];
            // No padding if the visible domain is Infinity, otherwise normalize
            // the padding widths by dividing by the frequency at which the
            // recordings were taken
            this.thresholds[i].paddingUnit = t.visibleDomain === Infinity ? 0 :
                    Math.floor((t.visibleDomain / this.sessionFrequency) * PADDING_RATIO);
        }

        // Setup our default bounds
        this.absoluteBounds = range.create(0, this.relTimes.length - 1);
        this.displayRange = range.copy(this.absoluteBounds);
        this.minimumBounds = range.copy(this.absoluteBounds);

        // Assume the whole domain is visible
        this.currentThresh = identifyThresh(Infinity);
        this.onResolutionChanged(this.currentThresh.resolution);
        this.onDomainChange(0, Infinity);
    };

    this.putTraces = (masks) => {
        const newMaskCodeNames = [];
        for (const mask of masks) {
            if (this.traces[mask.codeName] !== undefined) {
                console.error('Attempted to add trace with code name ' +
                    `"${mask.codeName}" more than once`);
                continue;
            }

            // Allocate a variable location for each resolution
            const emptyData = {};
            for (const thresh of this.thresholds) {
                emptyData[thresh.resolution] = {};
            }

            // Register the trace
            this.traces[mask.codeName] = {
                displayName: mask.displayName,
                downsampled: emptyData,
                uuid: uuid.v4(),
                color: this.colors[mask.codeName],
                fullRes: null // placeholder
            };

            newMaskCodeNames.push(mask.codeName);
        }

        const downsamplingPromises = _.map(masks, (m) =>
            downsampler.process(m.codeName, _.map(this.thresholds, (t) => t.resolution))
        );

        return Promise.all(downsamplingPromises).then((data) => {
            // data[i] is the downsampled data for mask[i]
            for (let i = 0; i < masks.length; i++) {
                self.traces[masks[i].codeName].downsampled = data[i].downsampled;
                self.traces[masks[i].codeName].fullRes = data[i].fullRes;
            }

            const newTraces = _.map(newMaskCodeNames, (m) => self.traces[m]);
            return applyResolution(newTraces);
        });
    };

    this.removeTraces = (masks) => {
        const doomedMasks = [];
        const doomedIndexes = [];

        for (const mask of masks) {
            if (this.traces[mask.codeName] === undefined) {
                console.error('Attempted to remove non-existant trace with code ' +
                    'name ' + mask.codeName);
                continue;
            }

            const trace = this.traces[mask.codeName];
            const traceIndex = _.findIndex(this.plotNode.data, (t) => t.uid === trace.uuid);
            if (traceIndex < 0) {
                console.error(`Already removed trace with code name '${mask.codeName}'`);
            } else {
                doomedMasks.push(mask);
                doomedIndexes.push(traceIndex);
            }
        }

        return Plotly.deleteTraces(this.plotNode, doomedIndexes).then(() => {
            for (const mask of doomedMasks) {
                delete self.traces[mask.codeName];
            }
        });
    };

    /**
     * Tells the TraceManager that the user has changed the domain of the plot.
     * If necessary, a trace at an alternate resolution will be switched out
     * for the current one.
     *
     * @param {string} visibleDomain The duration in milliseconds which across
     *                               the domain (x-axis) that is currently
     *                               visible to the user
     */
    this.onDomainChange = (startMillis, endMillis) => {
        const newThreshold = identifyThresh(endMillis - startMillis);
        // Convert start and end times into indexes
        const [startIndex, endIndex] = _.map([startMillis, endMillis], (t) => relTime.toIndex(this.relTimes, t));

        const paddingMultSize = newThreshold.paddingUnit * PADDING_ADD_MULT;

        if (newThreshold.resolution === this.currentThresh.resolution) {
            // Same resolution, expand the trace.
            const paddingThreshSize = this.currentThresh.paddingUnit * PADDING_THRESH_MULT;

            // If the visible range does not completely encompass this range,
            // add more data
            const minimumBounds = range.create(
                this.displayRange.start + paddingThreshSize,
                this.displayRange.end - paddingThreshSize
            );

            const visibleBoundsToUser = range.create(startIndex, endIndex);

            if (minimumBounds.start > visibleBoundsToUser.end || minimumBounds.end < visibleBoundsToUser.start) {
                // The user has jumped to a random position (probably through
                // the "inspect" button), reset everything
                const displayRange = range.create(startIndex - paddingMultSize, endIndex + paddingMultSize);
                this.displayRange = range.boundBy(displayRange, this.absoluteBounds);

                // Use applyResolution() to reset the buffer since we assume
                // that we have a contiguous buffer at all times
                return applyResolution(this.traces);
            } else if (!range.contained(minimumBounds, visibleBoundsToUser)) {
                // The user has dragged out of the buffer, append or prepend
                // to the current traces

                const additionRange = visibleBoundsToUser.start < minimumBounds.start ?
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

                for (const codeName of Object.keys(this.traces)) {
                    addDataToTrace(this.traces[codeName], additionRange);
                }

                if (additionRange.start === this.displayRange.end) {
                    this.displayRange = range.create(this.displayRange.start, additionRange.end);
                } else if (additionRange.end === this.displayRange.start) {
                    this.displayRange = range.create(additionRange.start, this.displayRange.end);
                }
            }
        } else {
            // Different resolution, create new traces
            const displayRange = range.create(startIndex - paddingMultSize, endIndex + paddingMultSize);
            this.displayRange = range.boundBy(displayRange, this.absoluteBounds);
            this.currentThresh = newThreshold;

            return applyResolution(this.traces).then(() => {
                self.onResolutionChanged(newThreshold.resolution);
            });
        }
    };

    /**
     * Called when the resolution is changed. Meant to be overridden and does
     * nothing by default.
     */
    this.onResolutionChanged = (/*newRes*/) => {};

    /**
     * Applies a new resolution to the given traces.
     *
     * @param  {array} traces  An array of traces to add/update. All elements must
     *                         be in the format used by this.traces. If any trace
     *                         has not been added to the plot, it will be added
     *                         here. If the trace already exists, it will be updated
     *                         with new data appropriate for the given threshold.
     */
    const applyResolution = (traces) => {

        // Find all new traces by filtering all traces whose UUID does not exist in
        // plot node's data object
        const newTraceData = _.filter(traces, (t) => traceIndexByUuid(t.uuid) < 0);
        const newTraces = _.map(newTraceData, (t) => {
            const computedData = createCoordinateData(t, self.displayRange, self.currentThresh);
            return {
                x: computedData.x,
                y: computedData.y,
                type: 'scatter',
                line: { color: t.color },
                uid: t.uuid,
                name: t.displayName
            };
        });

        if (newTraces.length > 0) {
            const traceCount = countPlottedTraces(self.plotNode);
            const indexes = _.range(traceCount, traceCount + newTraces.length);
            Plotly.addTraces(self.plotNode, newTraces, indexes);
        }

        // Identify pre-existing traces by getting the inverse of newTraces
        const newUuids = _.map(newTraces, (t) => t.uid);
        const oldTraceData = _.filter(traces, (t) => !newUuids.includes(t.uuid));

        const updateX = [], updateY = [], updateIndexes = [];
        for (const trace of oldTraceData) {
            const {x, y} = createCoordinateData(trace, self.displayRange, self.currentThresh, self.relTimes);
            updateX.push(x);
            updateY.push(y);
            updateIndexes.push(traceIndexByUuid(trace.uuid));
        }

        if (oldTraceData.length > 0) {
            const update = {
                x: updateX,
                y: updateY
            };
            return Plotly.restyle(self.plotNode, update, updateIndexes);
        } else {
            return Promise.resolve();
        }
    };

    /**
     * Gets the amount of non-behavior traces currently being displayed on the
     * plot. Since all behavior traces have their 'mode' properties set to
     * 'markers' and user-added traces have an undefined 'mode', we can simply
     * count the number of traces whose 'mode' is undefined.
     */
    const countPlottedTraces = () =>
        _.countBy(this.plotNode.data, (t) => t.mode).undefined || 0;

    const traceIndexByUuid = (uuid) => _.findIndex(self.plotNode.data, (d) => d.uid === uuid);

    const addDataToTrace = (traceData, range) => {
        const computedData = createCoordinateData(traceData, range, self.currentThresh);
        return Plotly.extendTraces(self.plotNode, {x: [computedData.x], y: [computedData.y]}, [traceIndexByUuid(traceData.uuid)]);
    };

    const createCoordinateData = (traceData, displayRange, threshold) => {
        const variation = traceData.downsampled[threshold.resolution];
        const x = [], y = [];
        const offset = displayRange.start;

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
            const indexes = variation.indexes;

            const offset = displayRange.start;
            const end = Math.min(displayRange.end, indexes.length);

            // Selectively add data to the arrays like above
            for (let i = 0; i < end; i++) {
                const adjustedIndex = indexes[i] + offset;
                x[i + offset] = new Date(relTime.relativeMillis(self.relTimes[adjustedIndex]));
                y[i + offset] = traceData.fullRes[adjustedIndex];
            }
        }

        return { x, y };
    };

    const identifyThresh = (visibleDomain) => {
        let thresh = self.thresholds[0];

        for (let i = 1; i < self.thresholds.length; i++) {
            if (visibleDomain < self.thresholds[i].visibleDomain) {
                thresh = self.thresholds[i];
            }
        }

        return thresh;
    };
}];

module.exports = {
    name: 'traceManager',
    def: serviceDef
};
