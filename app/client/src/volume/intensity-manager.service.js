const _ = require('lodash');
const LRU = require('lru-cache');
const tab64 = require('hughsk/tab64');
const range = require('../core/range.js');

// Amount of data in the LRU cache. Pretty arbitrary.
const CACHE_SIZE = 5000;

const def = ['session', 'intensityFetcher', function(session, intensityFetcher) {
    const self = this;
    const cache = new LRU(CACHE_SIZE);

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
        intensityFetcher.init(self.sessionId);
        // When we receive padding increments decode and cache them
        intensityFetcher.listen(decodeAndCache);

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

        for (let i = 0; i < data.length; i++) {
            cache.set(startIndex + i, decode(data[i]));
        }
    };

    /** Checks if an index exists in the cache */
    this.has = index => cache.has(index);

    /** Retrieves the cached value for a given index */
    this.cached = index => {
        let x = cache.get(index);

        // Unpack on the fly. If we fetch 200 points and we unpack all of them
        // prematurely and the user never views them, we will have wasted
        // computing power.
        if (!isUnpacked(x)) {
            cache.set(index, unpack(x));
        }

        return cache.get(index);
    };

    /**
     * Retrieves some data at the specified index. If there exists no such key
     * in the cache, the intensity data for that index will be fetched from the
     * network instead using fetchNetwork()
     *
     * @param  {number} index
     * @return {Promise}       A Promise that will resolve to the unpacked data
     *                         at the specified index
     */
    this.fetch = (index) => {
        return new Promise(function(resolve, reject) {
            if (self.has(index)) resolve(self.cached(index));
            else resolve(self.fetchNetwork(index));
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
    this.fetchNetwork = (index) => {
        // Make sure we have the required data
        if (!_init) {
            throw new Error('You need to init() the intensityManager service first');
        }

        return intensityFetcher.start(index).then(function(initialData) {
            // Decode the data the caller requested and cache it
            decodeAndCache([initialData], index);

            // Fetch from cache so it updates its 'recently-used-ness'
            return self.cached(index);
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
