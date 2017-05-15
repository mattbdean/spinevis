const _ = require('lodash');
const LRU = require('lru-cache');
const async = require('async');
const range = require('../core/range.js');
const strategy = require('./cache-strategy.conf.js');

const def = ['session', function IntensityManagerService(session) {
    const self = this;
    const cache = LRU(strategy.maxCacheLength);
    let queue = null;

    let lastRequestTime = null;
    let queueTimeout = null;

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
            return fetchNetwork(task).then(callback, callback);
        }, strategy.queueConcurrency);

        _init = true;
    };

    /** Checks if an index exists in the cache */
    this.has = index => cache.has(index);

    /** Retrieves the cached value for a given index */
    this.cached = index => {
        const x = cache.peek(index);

        // Unpack on the fly. If we fetch 200 points and we unpack all of them
        // prematurely and the user never views them, we will have wasted
        // computing power.
        if (!isUnpacked(x)) {
            cache.set(index, unpack(x));
        }

        // Return the value from the cache so we update its "recently used"-ness
        return cache.get(index);
    };

    this.fetch = (index) => {
        if (Date.now() - lastRequestTime < strategy.enqueueDelay && queueTimeout !== null)
            clearTimeout(queueTimeout);

        lastRequestTime = Date.now();

        queueTimeout = setTimeout(() => {
            const tasks = determineRequestIndicies(index);

            // Give priority to new request ranges by removing all tasks queued up
            // already
            if (tasks.length !== 0) queue.kill();

            // Push each task to the end of the queue. determineRequestIndicies()
            // returns an array in order of absolute distance from the given index.
            // In other words, |tasks[i] - index| < |tasks[i + 1] - index|. Push
            // tasks in this order so that we process the data closest to the given
            // index and then spread out from there.
            for (const t of tasks) queue.push(t);
        }, strategy.enqueueDelay);

        // Now we actually have to fetch the data
        return new Promise((resolve) => {
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
    const fetchNetwork = (index) => {
        // Make sure we have the required data
        if (!_init) {
            throw new Error('You need to init() the intensityManager service first');
        }

        return session.volume(self.sessionId, index).then((data) => {
            // data is an XHR response, data.data contains the actual ArrayBuffer
            cache.set(index, new Float32Array(data.data));
            // Let cached() unpack the data for us
            return this.cached(index);
        });
    };

    const determineRequestIndicies = (index) => {
        // Make sure we're not requesting anything out of bounds
        const min = Math.max(self.indexRange.start, index - strategy.idealPadding);
        const max = Math.min(self.indexRange.end, index + strategy.idealPadding);

        const indicies = [];
        for (let i = min; i < max; i++) {
            if (!self.has(i)) indicies.push(i);
        }

        // Sort by absolute distance from the start of the range to the index so
        // that points closer to the index get requested first
        return _.sortBy(indicies, (i) => Math.abs(i - index));
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
            const args = Array.prototype.slice.call(arguments, 1);
            while (i--) arr[length - 1 - i] = createNdArray.apply(this, args);
        }

        return arr;
    };

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
        const unpacked = createNdArray.apply(null, self.shape);

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
