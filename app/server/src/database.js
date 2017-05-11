let MongoClient = require('mongodb').MongoClient;

const appName = 'spinevis';

let state = {
    db: null,
    mode: null
};

// https://www.terlici.com/2014/09/15/node-testing.html

const TEST_URI = 'mongodb://127.0.0.1:27017/' + appName + '_test';
const PRODUCTION_URI = (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017') + '/' + appName;

module.exports.MODE_TEST = 'mode_test';
module.exports.MODE_PRODUCTION = 'mode_production';

/** Returns a Promise that will connect to our MongoDB instance */
module.exports.connect = function(mode) {
    return new Promise(function(fulfill, reject) {
        if (state.db && state.mode !== mode)
            return reject(new Error('Already connected'));

        return fulfill(mode === exports.MODE_PRODUCTION ? PRODUCTION_URI : TEST_URI);
    }).then(MongoClient.connect)
    .then(function(result) {
        state.db = result;
        state.mode = mode;
    });
};

module.exports.close = function() {
    return state.db.close();
};

module.exports.mongo = function() {
    return state.db;
};

module.exports.mode = function() {
    return state.mode;
};
