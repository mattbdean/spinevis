let express = require('express');
let router = express.Router();
let queries = require('../../queries.js');
let responses = require('./responses.js');
let validation = require('../validation.js');

/** Maximum sessions returned at one time */
const MAX_SESSION_DATA = 100;

let validateInteger = function(input, defaultValue, maxValue = Infinity) {
    // Assume that defaultValue is a positive integer
    let result = defaultValue;

    if (input !== undefined && !isNaN(input)) {
        // Round down to remove decimals
        result = Math.floor(parseInt(input));
    }

    if (result > maxValue)
        result = maxValue;

    return result;
};

/**
 * Runs a query and sends the result as JSON to the response
 *
 * @param  {string}   idRaw   Raw input from req.params.id
 * @param  {function}   queryFn Query function to execute
 * @param  {object}   res     Express Response object
 * @param  {function} next    Express 'next' function
 */
let runQuery = function(idRaw, queryFn, res, next) {
    if (!validation.sessionId(idRaw)) {
        // If the ID isn't valid than either our DB IDs are wrong or there is
        // guaranteed to be no session with that ID
        return next(responses.error('Session not found', {id: idRaw}, 404));
    }

    queryFn(idRaw).then(function(result) {
        res.json(responses.success(result));
    }).catch(function(err) {
        if (err.type && err.type === queries.ERROR_MISSING) {
            return next(responses.error(err.msg, err.data, 404));
        }

        return next(responses.error());
    });
};

// Get 'light' session metadata for all sessions
router.get('/', function(req, res, next) {
    // One might assume that we could do something like this:
    //
    //     let whatever = parseInt(req.query.whatever) || defaultValue;
    //
    // but this does not account for the fact that if the user input is '0',
    // JavaScript sees this as a "falsey" value and will use the default value
    // instead.
    let start = validateInteger(req.query.start, 0);
    let limit = validateInteger(req.query.limit, 20, MAX_SESSION_DATA);

    queries.findAllSessions(start, limit).then(function(sessionInfo) {
        // Return the data in a format that lets the user know that this
        // endpoint is iterable
        res.json(responses.paginatedSuccess(sessionInfo, limit, start));
    }).catch(function(err) {
        if (err.type && err.type === queries.ERROR_PAGINATION) {
            return next(responses.error(err.msg, err.data, 400));
        } else {
            return next(responses.error());
        }
    });
});

// Get 'heavy' session metadata for a specific session
router.get('/:id', function(req, res, next) {
    runQuery(req.params.id, queries.getSessionMeta, res, next);
});

// Get timeline data
router.get('/:id/timeline', function(req, res, next) {
    runQuery(req.params.id, queries.getTimeline, res, next);
});

module.exports = router;
