/**
 * queries.js -- abstraction layer between database and server. All input is
 * expected to be valid. Errors returned in this module are only related to
 * retrieving data from the database.
 */

let db = require('./database.js');
let _ = require('lodash');
let moment = require('moment');
let ObjectID = require('bson').ObjectID;

const COLL_META = 'meta';
const COLL_BEHAVIOR = 'behavior';
const COLL_MASK_TIME_COURSE = 'masktc';
const COLL_VOLUMES = 'volumes';

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
 * Returns a Moment instance that references the very first millisecond of the
 * given Date
 *
 * @param  {Date} date
 */
let normalizedMoment = (date) =>
    moment.utc(date).hours(0).minutes(0).seconds(0).milliseconds(0);

/**
 * Get simple, descriptive, metadata from all sessions. No 'heavy' data is
 * included (e.g. Polys/Pts). Returns an array. All parameters are optional.
 *
 * @param {number} start Start index. Will skip() this many sessions.
 * @param {number} limit How many records to return
 * @param {Date} startDate Starting date. All sessions starting on or after this
 *                         date will be retrieved.
 * @param {Date} endDate Ending date. If specified, will return all sessions
 *                       starting before the beginning of this day. For example,
 *                       if endDate is 15 January 2017, a session that has a
 *                       start time of 15 January 2017 @ 12:01 AM will not be
 *                       included.
 * @param {string} animal If provided, will only return sessions for this animal
 */
module.exports.findAllSessions = function(start, limit, startDate, endDate, animal) {
    let paginationError = verifyPaginationData(start, limit);
    if (paginationError !== null) {
        return Promise.reject(errorPagination(paginationError, start, limit));
    }

    const identifyingProperties = ['start_time', 'end_time', 'Animal', 'Run', 'name', 'nSamples', 'volRate', 'FOV'];

    let projection = {};
    for (let prop of identifyingProperties) {
        projection[prop] = 1;
    }

    let query = {};
    if (startDate !== undefined || endDate !== undefined) {
        query.start_time = {};

        if (startDate !== undefined) {
            query.start_time.$gte = new Date(normalizedMoment(startDate).valueOf());
        }
        if (endDate !== undefined) {
            query.start_time.$lt = new Date(
                normalizedMoment(endDate).subtract(1, 'millisecond')
            );
        }
    }

    if (animal !== undefined) {
        query.Animal = new RegExp(animal, 'i');
    }

    return db.mongo().collection(COLL_META)
        .find(query)
        .project(projection)
        .skip(start)
        .limit(limit)
        .sort({start_time: -1})
        .toArray();
};

/**
 * Gets an array of dates that sessions started in ascending order
 */
module.exports.getSessionDates = function() {
    return db.mongo().collection(COLL_META)
        .find()
        .project({ _id: 0, start_time: 1 })
        .sort({ start_time: 1 })
        .toArray()
        .then(function(docs) {
            return _.uniq(_.map(docs, d => d.start_time));
        });
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
        query.$or = createDynamicQuerySegment('evtType', types);
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

module.exports.getTimeline = function(sessionId, maskId) {
    let namesOnly = maskId === undefined;

    let query = {srcID: sessionId};
    if (!namesOnly) {
        query._id = ObjectID(maskId);
    }

    let cursor = db.mongo().collection(COLL_MASK_TIME_COURSE)
        .find(query);
    if (namesOnly) {
        cursor = cursor.project({_id: 1, maskName: 1});
    } else {
        cursor = cursor.limit(1);
    }

    return cursor.toArray().then(function(timeCourseDocs) {
        if (namesOnly) {
            return timeCourseDocs;
        } else {
            if (timeCourseDocs.length < 1) {
                // Couldn't find the requested trace
                return Promise.reject(errorMissing('Couldn\'t find mask', {maskId}));
            }

            return timeCourseDocs[0];
        }
    });
};

module.exports.getVolumes = function(sessionId, index) {
    let query = {srcID: sessionId, volNum: index};

    return db.mongo().collection(COLL_VOLUMES)
        .find(query)
        .toArray().then(function(data) {
            return data[0].pixelF.buffer;
        });
};

let createDynamicQuerySegment = function(key, values) {
    let segments = [];
    for (let val of values) {
        segments.push({[key]: val});
    }

    return segments;
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
