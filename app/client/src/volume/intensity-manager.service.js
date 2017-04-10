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
     * @param  {string} sessionId
     * @param  {number} maxIndex  The amount of imaging events in the session
     */
    this.init = (sessionId, maxIndex) => {
        self.sessionId = sessionId;

        // Range of possible indexes to request: [0, nSamples]
        self.indexRange = range.create(0, maxIndex);

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
     * in the cache, it will be fetched from the network instead using
     * fetchNetwork()
     *
     * @param  {number} index
     * @return {Promise}       A Promise that will resolve to the data at the
     *                         specified index
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

            // Decode the pixleF property of each element, which is a 32-bit
            // array encoded in base-64
            let decodedData = _.map(rawData, d => tab64.decode(d.pixelF, 'float32'));

            // Insert the decoded data into the cache
            put(decodedData, requestRange.start);

            // Prefer fetching the data from the LRU cache instead of from
            // the decodedData array so that its "recently used"-ness gets
            // updated
            return self.cached(index);
        });
    };

}];

module.exports = {
    def: def,
    name: 'intensityManager'
};
