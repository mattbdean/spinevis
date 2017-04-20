let _ = require('lodash');
let uuid = require('uuid');
let range = require('../core/range.js');
let relTime = require('./relative-time.js');
// let Plotly = require('plotly');

/** One unit of padding is equal to 10% of the treshold's normalized visibleDomain */
const PADDING_RATIO = 0.1;
/** The start/end of the domain is within 100% of the visible domain */
const PADDING_THRESH_MULT = 1;
/** Add 300% the visible domain once that threshold is crossed */
const PADDING_ADD_MULT = 3;

let serviceDef = ['$http', 'downsampler', function TraceManagerService($http, downsampler) {
    let self = this;

    this.init = function(config) {
        let keysToCopy = ['plotNode', 'sessionId', 'sessionFrequency', 'relTimes', 'colors', 'thresholds'];

        for (let key of keysToCopy) {
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
            let t = this.thresholds[i];
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
        this.onDomainChange(0, Infinity);
    };

    this.putTraces = function(masks) {
        let newMaskCodeNames = [];
        for (let mask of masks) {
            if (this.traces[mask.codeName] !== undefined) {
                console.error(`Attempted to add trace with code name ` +
                    `"${codeName}" more than once`);
                continue;
            }

            // Allocate a variable location for each resolution
            let emptyData = {};
            for (let thresh of this.thresholds) {
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

        let downsamplingPromises = _.map(masks, m =>
            downsampler.process(m.codeName, _.map(this.thresholds, t => t.resolution))
        );

        return Promise.all(downsamplingPromises).then(function(data) {
            // data[i] is the downsampled data for mask[i]
            for (let i = 0; i < masks.length; i++) {
                self.traces[masks[i].codeName].downsampled = data[i].downsampled;
                self.traces[masks[i].codeName].fullRes = data[i].fullRes;
            }

            let newTraces = _.map(newMaskCodeNames, m => self.traces[m]);
            return applyResolution(newTraces);
        });
    };

    this.removeTraces = function(masks) {
        let doomedMasks = [];
        let doomedIndexes = [];

        for (let mask of masks) {
            if (this.traces[mask.codeName] === undefined) {
                console.error('Attempted to remove non-existant trace with code ' +
                    'name ' + mask.codeName);
                continue;
            }

            let self = this;

            let trace = this.traces[mask.codeName];
            let traceIndex = _.findIndex(this.plotNode.data, t => t.uid === trace.uuid);
            if (traceIndex < 0) {
                console.error(`Already removed trace with code name '${mask.codeName}'`);
            } else {
                doomedMasks.push(mask);
                doomedIndexes.push(traceIndex);
            }
        }

        return Plotly.deleteTraces(this.plotNode, doomedIndexes).then(function() {
            for (let mask of doomedMasks) {
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
    this.onDomainChange = function(startMillis, endMillis) {
        let newThreshold = identifyThresh(endMillis - startMillis);
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
                    addDataToTrace(this.traces[codeName], additionRange);
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

            return applyResolution(this.traces);
        }
    };

    /**
     * Applies a new resolution to the given traces.
     *
     * @param  {array} traces  An array of traces to add/update. All elements must
     *                         be in the format used by this.traces. If any trace
     *                         has not been added to the plot, it will be added
     *                         here. If the trace already exists, it will be updated
     *                         with new data appropriate for the given threshold.
     */
    let applyResolution = function(traces) {

        // Find all new traces by filtering all traces whose UUID does not exist in
        // plot node's data object
        let newTraceData = _.filter(traces, t => traceIndexByUuid(t.uuid) < 0);
        let newTraces = _.map(newTraceData, t => {
            let computedData = createCoordinateData(t, self.displayRange, self.currentThresh);
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
            let traceCount = countPlottedTraces(self.plotNode);
            let indexes = _.range(traceCount, traceCount + newTraces.length);
            console.log(`Adding traces [${_.map(newTraceData, t => t.displayName)}] at indexes [${indexes}]`);
            Plotly.addTraces(self.plotNode, newTraces, indexes);
        }

        // Identify pre-existing traces by getting the inverse of newTraces
        let newUuids = _.map(newTraces, t => t.uid);
        let oldTraceData = _.filter(traces, t => !newUuids.includes(t.uuid));

        let updateX = [], updateY = [], updateIndexes = [];
        for (let trace of oldTraceData) {
            let {x, y} = createCoordinateData(trace, self.displayRange, self.currentThresh, self.relTimes);
            updateX.push(x);
            updateY.push(y);
            updateIndexes.push(traceIndexByUuid(trace.uuid));
        }

        if (oldTraceData.length > 0) {
            let update = {
                x: updateX,
                y: updateY
            };
            console.log(`Updating traces [${_.map(oldTraceData, t => t.displayName)}] at indexes [${updateIndexes}]`);
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
    let countPlottedTraces = () =>
        _.countBy(this.plotNode.data, t => t.mode).undefined || 0;

    let traceIndexByUuid = uuid => _.findIndex(self.plotNode.data, d => d.uid === uuid);

    let addDataToTrace = function(traceData, range) {
        let computedData = createCoordinateData(traceData, range, self.currentThresh);
        Plotly.extendTraces(self.plotNode, {x: [computedData.x], y: [computedData.y]}, [traceIndexByUuid(traceData.uuid)]);
    };

    let createCoordinateData = function(traceData, displayRange, threshold) {
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
                x[i + offset] = new Date(relTime.relativeMillis(self.relTimes[adjustedIndex]));
                y[i + offset] = traceData.fullRes[adjustedIndex];
            }
        }

        return {x: x, y: y};
    };

    let identifyThresh = function(visibleDomain) {
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
