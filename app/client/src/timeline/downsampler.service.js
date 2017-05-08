const _ = require('lodash');
const relTime = require('./relative-time.js');
const LRU = require('lru-cache');

const RESOLUTION_FULL = 100; // 100% = all data

const serviceDef = ['session', function DownsamplerService(session) {
    const self = this;

    // LRU cache with maximum size of 500
    const cache = new LRU(500);

    this.init = (sessionId, relTimes) => {
        this.sessionId = sessionId;
        this.relTimes = relTimes;
        this.initialized = true;
    };

    this.process = (traceName, resolutions) => {
        // Some simple validation first
        if (!this.initialized) throw new Error('init() first');
        if (traceName === undefined) throw new Error('traceName was undefined');

        if (cache.has(traceName)) {
            console.log('cache: ' + traceName);
            return Promise.resolve(cache.get(traceName));
        }

        return session.timeline(this.sessionId, traceName).then((res) => {
            return downsample(res.data.data.maskF, traceName, resolutions);
        });
    };

    const downsample = (fullRes, traceName, resolutions) => {
        const downsampled = {};
        for (let resolution of resolutions) {
            let resolutionData;

            // Make sure we're dealing with integers > 1 and < RESOLUTION_FULL
            resolution = Math.floor(resolution);
            if (resolution < 1) resolution = 1;

            if (resolution < RESOLUTION_FULL) {
                const indexes = [];

                // Prevent 0% or negative resolutions
                if (resolution < 1) resolution = 1;
                // Break up the timeline data into chunks, which we will
                // find the maximum value of and then append that index to
                // the downsampled array.

                // 50% res = chunk size of 2, 25% res = chunk size of 4, etc.
                const chunkSize = Math.round(RESOLUTION_FULL / resolution);
                const chunks = _.chunk(fullRes, chunkSize);

                for (let i = 0; i < chunks.length; i++) {
                    // Find the index within this chumk of the maximum value
                    // of this chunk
                    const localIndex = _.indexOf(chunks[i], _.max(chunks[i]));
                    // Calculate the index of this maximum value in reference
                    // to the full resolution timeline
                    const globalIndex = (i * chunkSize) + localIndex;
                    indexes.push(globalIndex);
                }
                resolutionData = { indexes };
            } else {
                resolutionData = {
                    x: _.map(self.relTimes, t => new Date(relTime.relativeMillis(t))),
                    y: fullRes
                };
            }

            downsampled[resolution] = resolutionData;
        }

        const data = {
            fullRes: fullRes,
            downsampled: downsampled
        };
        cache.set(traceName, data);

        return data;
    };
}];

module.exports = {
    name: 'downsampler',
    def: serviceDef
};
