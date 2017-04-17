const _ = require('lodash');
const tab64 = require('hughsk/tab64');
const async = require('async');
const range = require('../core/range.js');

// The ideal amount of padding on either side of the requested index. This
// service will continue to run until this is satisified.
const IDEAL_PADDING = 50;

// How many tasks will run at a time. See
// https://caolan.github.io/async/docs.html#queue for more
const QUEUE_CONCURRENCY = 3;

// Each data point is ~318 kb, so each padding increment requests about 1 MB
// of data per request, something that most internet speeds should be able to
// handle pretty simply
const PADDING_INCREMENT = 3;

// The amount of additional padding to request when the user gets close to the
// end of the cached range
const BUFFER_EXTENSION = 30;

const def = ['session', function(session) {
    const self = this;
    const cache = {};
    let queue = null;
    let cacheRange = null;

    let _init = false;

    /**
     * Initializes the service. Must call before using many of the functions
     * this service provides.
     * @param  {object} c  Configuration object. Must have the properties listed
     *             below:
     * @param  {string} c.sessionId
     * @param  {number} c.maxIndex  The amount of imaging events in the session
     * @param  {number[]} c.shape  An array specifying the shape of the data that
     *             will be unpacked. The first element should be the amount of
     *             traces. The second element should be the length of an element
     *             at surfacecolor[i] since surfacecolor[i].length is constant
     *             for all elements in surfacecolor. The second element should
     *             be the length of the element at surfacecolor[i][j], since
     *             surfacecolor[i][j].length is constant for all elements in
     *             surfacecolor[i][j].
     */
    this.init = (c) => {
        self.sessionId = c.sessionId;

        // Range of possible indexes to request: [0, nSamples]
        self.indexRange = range.create(0, c.maxIndex);
        self.shape = c.shape;

        queue = async.queue((task, callback) => {
            // Use callback for both then() and catch()
            return fetchNetwork(task.start, task.end).then(callback, callback);
        }, QUEUE_CONCURRENCY);

        _init = true;
    };

    /**
     * Inserts an array of data into the cache.
     *
     * @param  {number[]} data
     * @param  {number}   startIndex The index at which the value for data[0]
     *                               should be placed
     */
    const decodeAndCache = (data, startIndex) => {
        // Ensure that we are dealing with an array. Any other input type is
        // probably a programming error
        if (!Array.isArray(data)) {
            throw new Error('expecting data to be an array');
        }

        const decoded = [];
        for (let i = 0; i < data.length; i++) {
            const d = decode(data[i]);
            decoded.push(d);
            cache[startIndex + i] = d;
        }

        return decoded;
    };

    /** Checks if an index exists in the cache */
    this.has = index => cache[index] !== undefined;

    /** Retrieves the cached value for a given index */
    this.cached = index => {
        let x = cache[index];

        // Unpack on the fly. If we fetch 200 points and we unpack all of them
        // prematurely and the user never views them, we will have wasted
        // computing power.
        if (!isUnpacked(x)) {
            cache[index] = unpack(x);
        }

        return cache[index];
    };

    this.fetch = (index) => {
        const tasks = determineRequestRanges(index);

        // Give priority to new request ranges by removing all tasks queued up
        // already
        if (tasks.length !== 0) queue.kill();

        // Push each task to the end of the queue. determineRequestRanges()
        // returns an array in order of absolute distance from the given index.
        // In other words, |tasks[i].start - index| < |tasks[i + 1].start - index|
        // Push tasks in this order so that we process the data closest to the
        // given index and then spread out from there.
        for (let t of tasks) queue.push(t);

        // Now we actually have to fetch the data
        return new Promise(function(resolve, reject) {
            if (self.has(index)) {
                // We already have this data cached
                return resolve(self.cached(index));
            } else {
                // We don't have this data cached, fetch it from the network
                return resolve(fetchNetwork(index).then(() => {
                    // Use self.cached() to unpack the flat array into a 3D array
                    return self.cached(index);
                }));
            }
        });
    };

    /**
     * Retrieves some intensity data from the API and inserts it into the cache.
     * Some extra data will also be requested as a buffer to save on HTTP
     * requests.
     *
     * @param  {number} index
     * @return {Promise}       A Promise that will resolve to the data at the
     *                         requested index
     */
    const fetchNetwork = (start, end) => {
        // Make sure we have the required data
        if (!_init) {
            throw new Error('You need to init() the intensityManager service first');
        }

        return request(start, end).then(data => {
            return decodeAndCache(data, start);
        });
    };

    const determineRequestRanges = function(index) {
        // Make sure we're not requesting anything out of bounds
        const max = Math.min(self.indexRange.end + 1, index + IDEAL_PADDING + 1);
        const min = Math.max(self.indexRange.start, index - IDEAL_PADDING);

        const createRanges = (start, end) => {
            const ranges = [];
            let rangeStart = start;
            let count = 0;

            for (let i = start; i < end; i++) {
                if (self.has(i)) {
                    if (count === 0) {
                        rangeStart++;
                    } else {
                        ranges.push(range.create(rangeStart, rangeStart + count));
                        rangeStart += count + 1;
                        count = 0;
                    }
                } else {
                    if (++count === PADDING_INCREMENT) {
                        ranges.push(range.create(rangeStart, rangeStart + count));
                        rangeStart = i + 1;
                        count = 0;
                    }
                }
            }

            if (count !== 0) {
                // There are leftovers
                ranges.push(range.create(rangeStart, rangeStart + count));
            }

            return ranges;
        };

        const combinedRanges = _.concat(
            createRanges(min, index),
            // Don't include the actual index because that will be handled
            // elsewhere
            createRanges(index + 1, max)
        );

        // Sort by absolute distance from the start of the range to the index so
        // that points closer to the index get requested first
        return _.sortBy(combinedRanges, (r) => Math.abs(r.start - index));
    };

    const request = (startIndex, endIndex) => {
        return session.volume(self.sessionId, startIndex, endIndex).then(function(res) {
            // We only care about the intensity data, which is located in
            // the pixelF property of each element of the data array
            return _.map(res.data.data, d => d.pixelF);
        });
    };

    /**
     * Dynamically creates an n-dimensional array. The parameters to this
     * function specify its shape such that createNdArray(5, 6, 7) returns
     * an n-dimensional array with arr.length === 5, arr[i].length === 6, and
     * arr[i][j].length === 7.
     *
     * Stolen from StackOverflow:
     * http://stackoverflow.com/a/966938/1275092
     */
    const createNdArray = function(length) {
        let arr = new Array(length || 0),
        i = length;

        if (arguments.length > 1) {
            let args = Array.prototype.slice.call(arguments, 1);
            while (i--) arr[length - 1 - i] = createNdArray.apply(this, args);
        }

        return arr;
    };

    /**
     * Parses a base-64 encoded string into a float-32 array
     *
     * @param  {object} encoded Base-64 encoded float-32 array
     * @return {Float32Array}   A Float32Array representing the
     */
    const decode = (encoded) => tab64.decode(encoded, 'float32');

    /**
     * Interprets a 1-dimensional Float32Array as a 3-dimensional array such
     * that the surfacecolor for some trace at index `i` is available at
     * unpack(...)[i]
     *
     * @param  {Float32Array} flat A 1-dimensional array to be interpreted as a
     *                             3-dimensional array
     * @return {Float32Array} A 3-dimensional Float32Array
     */
    const unpack = (flat) => {
        // Create an empty array with the same shape as self.shape
        let unpacked = createNdArray.apply(null, self.shape);

        let count = 0;
        for (let j = 0; j < self.shape[1]; j++) {
            for (let k = 0; k < self.shape[2]; k++) {
                for (let i = 0; i < self.shape[0]; i++) {
                    unpacked[i][j][k] = flat[count++];
                }
            }
        }

        return unpacked;
    };

    /**
     * Attempts to determine if some cached data `x` has already been unpacked.
     * If `x` has not yet been unpacked, each element in the array will be a
     * number. If it has been unpacked, each element in the array will be
     * another array.
     */
    const isUnpacked = (x) => Array.isArray(x[0]);
}];

module.exports = {
    def: def,
    name: 'intensityManager'
};
