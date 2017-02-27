/**
 * queries.js -- abstraction layer between database and server. All input is
 * expected to be valid. Errors returned in this module are only related to
 * retrieving data from the database.
 */

let db = require('./database.js');
let _ = require('lodash');

const COLL_META = 'meta';
const COLL_TIME = 'time';
const COLL_BEHAVIOR = 'behavior';

module.exports.ERROR_MISSING = "missing";
module.exports.ERROR_PAGINATION = "pagination";

function QueryError(msg, data, errType) {
    this.msg = msg;
    this.data = data;
    this.type = errType;
}

let errorMissing = function(msg, data) {
    return new QueryError(msg, data, module.exports.ERROR_MISSING);
};

let errorPagination = function(msg, start, limit) {
    let paginationData = {
        start: start,
        limit: limit
    };
    return new QueryError(msg, paginationData, module.exports.ERROR_PAGINATION);
};

let verifyPaginationData = function(start, limit) {
    let err = null;
    if (typeof start !== 'number') err = 'start is not a number, was ' + typeof start;
    if (typeof limit !== 'number') err = 'limit is not a number, was ' + typeof limit;
    if (limit <= 0) err = 'limit must be greater than 0';
    if (start < 0) err = 'start must be greater than or equal to 0';

    return err;
};

/**
 * Get simple, descriptive, metadata from all sessions. No 'heavy' data is
 * included (e.g. Polys/Pts). Returns an array.
 */
module.exports.findAllSessions = function(start, limit) {

    let paginationError = verifyPaginationData(start, limit);
    if (paginationError !== null) {
        return Promise.reject(errorPagination(paginationError, start, limit));
    }

    let identifyingProperties = ['start_time', 'end_time', 'Animal', 'Run', 'nSamples', 'volRate'];

    let projection = {};
    for (let prop of identifyingProperties) {
        projection[prop] = 1;
    }

    return db.mongo().collection(COLL_META)
        .find({})
        .project(projection)
        .skip(start)
        .limit(limit)
        .toArray();
};

/**
 * Get all metadata, both 'light' and 'heavy', for a specific session.
 *
 * @param id The value of the session's '_id' field. Case sensitive.
 */
module.exports.getSessionMeta = function(id) {
    return db.mongo().collection(COLL_META).find({_id: id}).limit(1).toArray().then(function(sessions) {
        if (sessions.length > 0)
            return sessions[0];

        return Promise.reject(errorMissing(`No sessions for ID '${id}'`, {id: id}));
    });
};

/**
 * Checks if a session exists by checking if a document in the metadata collection
 * has an ID equal to the one specified.
 */
module.exports.sessionExists = function(id) {
    return db.mongo().collection(COLL_META)
        .find({_id: id})
        .project({_id: 1})
        .limit(1)
        .toArray()
        .then(function(results) {
            if (results.length === 0)
                return false;
            return true;
        });
};

module.exports.getTimeline = function(id) {
    return db.mongo().collection(COLL_META)
        .find({_id: id})
        .project({globalTC: 1, _id: 0})
        .limit(1)
        .toArray()
        .then(function(results) {
            if (results.length === 1) {
                return results[0].globalTC;
            }

            return Promise.reject(errorMissing(`No timeline for ID '${id}'`, {id: id}));
        });
};

/**
 * Gets behavior data for a specific session
 * @param  {string} id   Session ID, e.g.
 * @param  {array} types Array of types of behavior to look for, e.g. ["lick left", "lick correct"]
 * @return {object}      An object mapping behavior types to the imaging index
 *                       at which the event occurred. For example, an index of
 *                       24 refers to the 24th time the brain was imaged
 */
module.exports.getBehavior = function(id, types = []) {
    let query = {srcID: id};

    // $or operators cannot contain an empty array
    if (types.length > 0) {
        // Generate an $or query based on the event types given
        let typeQuery = [];
        for (let type of types) {
            // For each event add a condition to the query that matches evtType to
            // the given type
            typeQuery.push({evtType: {$eq: type}});
        }

        query.$or = typeQuery;
    }

    return db.mongo().collection(COLL_BEHAVIOR)
        .find(query)
        .toArray()
        .then(function(behaviorDocs) {
            if (types.length > 0 && behaviorDocs.length !== types.length) {
                // Identify the types that could not be found
                let returnedTypes = _.map(behaviorDocs, o => o.evtType);
                let missing = _.filter(types, t => returnedTypes.indexOf(t) < 0);
                return Promise.reject(errorMissing('Some behavior types could not be found', {types: missing}));
            }

            let transformedData = {};

            for (let doc of behaviorDocs) {
                transformedData[doc.evtType] = doc.volNums;
            }

            return transformedData;
        });
}
