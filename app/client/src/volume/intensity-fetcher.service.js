const queue = require('async/queue');
const _ = require('lodash');

// The ideal amount of padding on either side of the requested index. This
// service will continue to run until this is satisified.
const IDEAL_PADDING = 50;

// How many tasks will run at a time. See
// https://caolan.github.io/async/docs.html#queue for more
const QUEUE_CONCURRENCY = 5;

// Each data point is ~318 kb, so each padding increment requests about 1 MB
// of data per request, something that most internet speeds should be able to
// handle pretty simply
const PADDING_INCREMENT = 3;

const def = ['session', function(session) {
    const self = this;

    let listener = () => {};
    let sessionId;

    this.init = function(id) {
        sessionId = id;
    };

    this.start = function(index) {
        if (sessionId === undefined)
            throw new Error('init() this intensityFetcher first');
        return request(index).then(function(data) {
            createQueue(index);
            // Since we only requested the one index there will only be one
            // element in the array
            return data[0];
        });
    };

    this.stop = function() {
        running = false;
        padding = null;
    };

    const request = (startIndex, endIndex) => {
        return session.volume(sessionId, startIndex, endIndex).then(function(res) {
            // We only care about the intensity data, which is located in
            // the pixelF property of each element of the data array
            return _.map(res.data.data, d => d.pixelF);
        });
    }

    const emit = (data, startIndex) => {
        listener(data, startIndex);
    };

    const createQueue = function(baseIndex) {
        let q = queue((task, callback) => {
            console.log(`Fetching indexes [${task.start},${task.end})`);
            return request(task.start, task.end).then(function(data) {
                emit(data, task.start);
                callback();
            }).catch(function(err) {
                callback(err);
            });
        });

        for (let i = 1; i < IDEAL_PADDING; i += PADDING_INCREMENT) {
            const forward = {
                start: baseIndex + i,
                end: baseIndex + i + PADDING_INCREMENT
            };
            const backward = {
                end: baseIndex - i,
                start: baseIndex - i - PADDING_INCREMENT
            };
            q.push(forward, (err) => {
                if (err) throw err;
                console.log(`done for [${forward.start},${forward.end})`);
            });

            q.push(backward, (err) => {
                if (err) throw err;
                console.log(`done for [${backward.start},${backward.end})`);
            });
        }
    };

    this.listen = (l) => { listener = l; };
}];

module.exports = {
    def: def,
    name: 'intensityFetcher'
};
