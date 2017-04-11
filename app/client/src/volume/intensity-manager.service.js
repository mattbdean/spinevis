const _ = require('lodash');
const LRU = require('lru-cache');
const tab64 = require('hughsk/tab64');
const range = require('../core/range.js');

// Amount of data in the LRU cache. Pretty arbitrary.
const CACHE_SIZE = 5000;

// Amount of items to request on either side of the focused endpoint. In other
// words, the total buffer size will be `BUFFER_PADDING * 2`
const BUFFER_PADDING = 100;

const def = ['session', function(session) {
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

        _init = true;
    };

    /**
     * Inserts an array of data into the cache.
     *
     * @param  {number[]} data
     * @param  {number}   startIndex The index at which the value for data[0]
     *                               should be placed
     */
    const put = (data, startIndex) => {
        // Ensure that we are dealing with an array. Any other input type is
        // probably a programming error
        if (!Array.isArray(data)) {
            throw new Error('expecting data to be an array');
        }

        for (let i = 0; i < data.length; i++) {
            cache.set(startIndex + i, data[i]);
        }
    };

    /** Checks if an index exists in the cache */
    this.has = index => cache.has(index);

    /** Retrieves the cached value for a given index */
    this.cached = index => cache.get(index);

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

        // requestRange: [index - BUFFER_PADDING, index + BUFFER_PADDING]
        let requestRange = range.fromPadding(index, BUFFER_PADDING);
        // Make sure we don't request an invalid point
        requestRange = range.boundBy(requestRange, self.indexRange);

        return session.volume(self.sessionId, requestRange.start, requestRange.end)
        .then(function(res) {
            // The data at the index `index - BUFFER_PADDING` is data[0]
            let rawData = res.data.data;

            // Unpack each element of the raw data and insert it into the cache
            put(_.map(rawData, unpack), requestRange.start);

            // Prefer fetching the data from the LRU cache instead of from
            // the decodedData array so that its "recently used"-ness gets
            // updated
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
            while(i--) arr[length-1 - i] = createNdArray.apply(this, args);
        }

        return arr;
    }

    /**
     * Decodes a 1-dimensional-base 64-encoded array into a 3-dimensional array
     * such that the surfacecolor for some trace at index `i` is available at
     * unpack(...)[i]
     *
     * @param  {string} encoded  An float 32 array encoded as a base 64 string
     */
    const unpack = (encoded) => {
        // Decode the pixleF property of the element into a float32 array
        let decoded = tab64.decode(encoded.pixelF, 'float32');

        // Create an empty array with the same shape as self.shape
        let unpacked = createNdArray.apply(null, self.shape);

        let count = 0;
        for (let j = 0; j < self.shape[1]; j++) {
            for (let k = 0; k < self.shape[2]; k++) {
                for (let i = 0; i < self.shape[0]; i++) {
                    unpacked[i][j][k] = decoded[count++];
                }
            }
        }

        return unpacked;
    };
}];

module.exports = {
    def: def,
    name: 'intensityManager'
};
