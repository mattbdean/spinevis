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
const COLL_MASK_TIME_COURSE = 'masktc';

const RESOLUTION_FULL = 100; // 100% = all data

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

/**
 * Returns an object mapping the name of the trace to the indexes and values
 * that should be displayed.
 * @param  {string} id         Session ID to fetch timeline for
 * @param  {Number} resolution Percentage of data to show. resolution = 10
 *                             would display the maximum of every 10 samples,
 *                             resolution = 25 would display max of every 4, etc.
 * @param  {Number} start      Starting index (optional)
 * @param  {Number} end        End index (optional)
 * @return {object}            An object whose keys are trace names and values
 *                             are arrays containg the indexes of the imaging
 *                             events to keep.
 */
module.exports.getTimeline = function(id, resolution = RESOLUTION_FULL, start, end) {
    return db.mongo().collection(COLL_META)
        .find({_id: id})
        .project({globalTC: 1, nSamples: 1, _id: 0})
        .limit(1)
        .toArray()
        .then(function(results) {
            if (results.length === 1) {
                let session = results[0];
                let rawTimeline = session.globalTC;

                if (start === undefined || start < 0) start = 0;
                if (end === undefined || end >= rawTimeline.length) end = rawTimeline.length - 1;

                rawTimeline = _.slice(rawTimeline, start, end);

                let downsampled;

                // Make sure we're dealing with integers
                resolution = Math.floor(resolution);

                if (resolution < RESOLUTION_FULL) {
                    if (resolution < 1) resolution = 1;
                    // Break up the timeline data into chunks, which we will
                    // find the maximum value of and then append that index to
                    // the downsampled array.

                    // 50% res = chunk size of 2, 25% res = chunk size of 4, etc.
                    let chunkSize = RESOLUTION_FULL / resolution;
                    let chunks = _.chunk(rawTimeline, chunkSize);
                    downsampled = [];

                    for (let i = 0; i < chunks.length; i++) {
                        // Find the index within this chumk of the maximum value
                        // of this chunk
                        let localIndex = _.indexOf(chunks[i], _.max(chunks[i]));
                        // Calculate the index of this maximum value in reference
                        // to the full resolution timeline
                        let globalIndex = (i * chunkSize) + localIndex;
                        downsampled.push(globalIndex);
                    }
                } else {
                    downsampled = _.range(rawTimeline.length)
                }

                return {
                    start: start,
                    end: end,
                    sampleSize: rawTimeline.length,
                    actualSize: downsampled.length,
                    traces: {
                        global: downsampled
                    }
                };
            }

            return Promise.reject(errorMissing(`No timeline for ID '${id}'`, {id: id}));
        });
};

/**
 * Gets behavior data for a specific session
 * @param  {string} id   Session ID, e.g. "BMWR34:20160106:1:1"
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

            return rearrangeByKey(behaviorDocs, 'evtType', 'volNums');
        });
};

module.exports.getTraces = function(sessionId, traceIds) {
    let namesOnly = traceIds === undefined || traceIds.length == 0;

    let query = {srcID: sessionId};
    if (!namesOnly) {
        let traceIdQuery = [];
        for (let id of traceIds) {
            // For each trace ID add a condition to the $or segment
            traceIdQuery.push({maskNum: id});
        }
        query.$or = traceIdQuery;
    }

    let cursor = db.mongo().collection(COLL_MASK_TIME_COURSE)
        .find(query);
    if (namesOnly) {
        cursor = cursor.project({_id: 0, maskNum: 1});
    }

    return cursor.toArray().then(function(timeCourseDocs) {
        if (namesOnly) {
            return _.map(timeCourseDocs, doc => doc.maskNum);
        } else {
            if (timeCourseDocs.length !== traceIds.length) {
                // Find the IDs that couldn't be found
                let returned = _.map(timeCourseDocs, t => t.maskNum);
                let missing = _.filter(traceIds, id => returned.indexOf(id) < 0);
                return Promise.reject(errorMissing('Some time courses could not be found', {timeCourses: missing}));
            }

            return rearrangeByKey(timeCourseDocs, 'maskNum', 'maskF');
        }
    });
};

/**
 * Transforms an array of objects into a single object such that each property
 * in the object has a key of docs[i][keyName] and a value of docs[i][valueName]
 */
let rearrangeByKey = function(docs, keyName, valueName) {
    let transformedData = {};

    for (let doc of docs) {
        transformedData[doc[keyName]] = doc[valueName];
    }

    return transformedData;
};
