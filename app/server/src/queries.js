let db = require('./database.js');

const COLL_META = 'meta';
const COLL_TIME = 'time';

/**
 * Get simple, descriptive, metadata from all trials. No 'heavy' data is
 * included (e.g. Polys/Pts). Returns an array.
 */
module.exports.findAllTrials = function() {
    let identifyingProperties = ['start_time', 'end_time', 'Animal', 'Run', 'nSamples'];

    let projection = {};
    for (let prop of identifyingProperties) {
        projection[prop] = 1;
    }

    return db.mongo().collection(COLL_META).find({}).project(projection).toArray();
};

/**
 * Get all metadata, both 'light' and 'heavy', for a specific trial.
 *
 * @param id The value of the trial's '_id' field. Case sensitive.
 */
module.exports.getTrialMeta = function(id) {
    return db.mongo().collection(COLL_META).find({_id: id}).limit(1).toArray().then(function(trials) {
        if (trials.length > 0)
            return trials[0];

        return Promise.reject(`No trials for ID '${id}'`);
    });
};
