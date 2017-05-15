const _ = require('lodash');
const express = require('express');
const moment = require('moment');
const Parameter = require('pinput/parameter');
const Contract = require('pinput/contract');

const router = express.Router();
const queries = require('../../queries.js');
const responses = require('./responses.js');
const validation = require('../validation.js');
const input = require('./input.js');


/** Maximum sessions returned at one time */
const MAX_SESSION_DATA = 100;

/**
 * Runs a query and sends the result as JSON to the response. Takes input
 * Parameters and if all are valid, passes values to queryFn
 *
 * @param  {array}     parameters An array of Parameters
 * @param  {function}  queryFn    Query function to execute
 * @param  {object}    res        Express Response object
 * @param  {function}  next       Express 'next' function
 */
const runQuery = function(parameters, queryFn, res, next, paginated = false, contracts = []) {
    // If any parameter is invalid, reject
    for (const p of parameters) {
        if (p.valid === false) {
            return next(responses.errorObj(p.error));
        }
    }

    for (const contract of contracts) {
        contract.check(parameters);
        if (contract.valid === false) {
            return next(responses.errorObj(contract.error));
        }
    }

    // Call queryFn with the parameter values
    queryFn.apply(null, _.map(parameters, i => i.value))
    .then(function(result) {
        // Choose the correct type of response, whether that be a standard
        // success or a paginated success object
        let response;
        if (paginated) {
            // Identify values of start and limit
            const start = _.find(parameters, p => p.name === 'start').value;
            const limit = _.find(parameters, p => p.name === 'limit').value;
            response = responses.paginatedSuccess(result, limit, start);
        } else {
            response = responses.success(result);
        }
        res.json(response);
    }).catch(function(err) {
        // Handle errors. If the error has a type property, we know it was
        // from a function in the queries module.
        if (err.type) {
            let status;
            if (err.type === queries.ERROR_MISSING)
                status = 404;
            else if (err.type === queries.ERROR_PAGINATION)
                // Send 400 Bad Request because the client sent bad data
                status = 400;

            // Make sure the type was one of the errors already checked for
            if (status !== undefined) {
                return next(responses.error(err.message, err.data, status));
            }
        }

        // We don't know how to handle this kind of error, send a 500 Internal
        // Server Error.
        return next(responses.error());
    });
};

const inputDateFormat = 'YYYY-MM-DD';
// Validate a date using moment.js strict mode (3rd parameter = true for strict)
const validateDate = (dateStr) => moment(dateStr, inputDateFormat, true).isValid();

const makeDateParam = (name, source, optional = true) => new Parameter({
    name: name,
    rawInput: source[name],
    validate: validateDate,
    errorMessage: `${name} must be in the format ${inputDateFormat}`,
    optional: optional
});

// Get 'light' session metadata for all sessions
router.get('/', function(req, res, next) {
    const start = input.integer('start', req.query.start, 0, Infinity);
    start.defaultAllowed = true;
    start.defaultValue = 0;

    const limit = input.integer('limit', req.query.limit, 1, MAX_SESSION_DATA);
    limit.defaultAllowed = true;
    limit.defaultValue = 20;

    const parameters = [
        new Parameter(start),
        new Parameter(limit),
        makeDateParam('startDate', req.query),
        makeDateParam('endDate', req.query),
        new Parameter({
            name: 'animal',
            rawInput: req.query.animal,
            // Accept all input
            validate: () => true,
            errorMessage: 'animal was invalid',
            optional: true
        })
    ];

    // Make sure that if both startDate and endDate are defined that startDate
    // comes before endDate
    const contracts = [new Contract({
        names: ['startDate', 'endDate'],
        verify: (startDate, endDate) => {
            // We only care if both startDate and endDate are defined
            if (startDate === undefined || endDate === undefined) return true;
            // Parse each date using moment
            const [start, end] = _.map([startDate, endDate],
                d => moment(d, inputDateFormat));
            return start.isBefore(end);
        },
        messageOnBroken: 'startDate must be before endDate'
    })];

    runQuery(parameters, queries.findAllSessions, res, next, true, contracts);
});

router.get('/dates', function(req, res, next) {
    runQuery([], queries.getSessionDates, res, next);
});

// Get 'heavy' session metadata for a specific session
router.get('/:id', function(req, res, next) {
    runQuery([input.sessionId(req.params.id)], queries.getSessionMeta, res, next);
});

router.get('/:id/behavior', function(req, res, next) {
    const parameters = [
        input.sessionId(req.params.id),
        new Parameter({
            name: 'types',
            rawInput: req.query.types,
            array: true,
            optional: true,
            validate: validation.alphabeticWords,
            errorMessage: 'Invalid event types'
        })
    ];

    runQuery(parameters, queries.getBehavior, res, next);
});

router.get('/:id/timeline', function(req, res, next) {
    runQuery([input.sessionId(req.params.id)], queries.getTimeline, res, next);
});

const validateObjectId = (id) => {
    return /^[A-Za-z0-9]{24}$/.test(id);
};

router.get('/:id/timeline/:traceId', function(req, res, next) {
    const parameters = [
        input.sessionId(req.params.id),
        new Parameter({
            name: 'traceId',
            rawInput: req.params.traceId,
            validate: validateObjectId,
            errorMessage: 'Invalid trace ID'
        })
    ];

    runQuery(parameters, queries.getTimeline, res, next);
});

router.get('/:id/volume/:index', function(req, res, next) {
    const parameters = [
        input.sessionId(req.params.id),
        // start is a required integer parameter with no default value that must
        // be greater than 0
        new Parameter(input.integer('index', req.params.index, 0)),
    ];

    for (const p of parameters) {
        if (p.valid === false) {
            return next(responses.errorObj(p.error));
        }
    }

    return queries.getVolumes(parameters[0].value, parameters[1].value).then(function(binaryData) {
        res.write(binaryData, 'binary');
        res.end(null, 'binary');
    }).catch(function(err) {
        throw err;
    });
});

module.exports = router;
