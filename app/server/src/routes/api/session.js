let _ = require('lodash');
let express = require('express');
let moment = require('moment');
let Parameter = require('pinput/parameter');
let Contract = require('pinput/contract');

let router = express.Router();
let queries = require('../../queries.js');
let responses = require('./responses.js');
let validation = require('../validation.js');
let input = require('./input.js');


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
let runQuery = function(parameters, queryFn, res, next, paginated = false, contracts = []) {
    // If any parameter is invalid, reject
    for (let p of parameters) {
        if (p.valid === false) {
            return next(responses.errorObj(p.error));
        }
    }

    for (let contract of contracts) {
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
            let start = _.find(parameters, p => p.name === 'start').value;
            let limit = _.find(parameters, p => p.name === 'limit').value;
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
let validateDate = (dateStr) => moment(dateStr, inputDateFormat, true).isValid();

let makeDateParam = (name, source, optional = true) => new Parameter({
    name: name,
    rawInput: source[name],
    validate: validateDate,
    errorMessage: `${name} must be in the format ${inputDateFormat}`,
    optional: optional
});

// Get 'light' session metadata for all sessions
router.get('/', function(req, res, next) {
    let start = input.integer('start', req.query.start, 0, Infinity);
    start.defaultAllowed = true;
    start.defaultValue = 0;

    let limit = input.integer('limit', req.query.limit, 1, MAX_SESSION_DATA);
    limit.defaultAllowed = true;
    limit.defaultValue = 20;

    let parameters = [
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
    let contracts = [new Contract({
        names: ['startDate', 'endDate'],
        verify: (startDate, endDate) => {
            // We only care if both startDate and endDate are defined
            if (startDate === undefined || endDate === undefined) return true;
            // Parse each date using moment
            let [start, end] = _.map([startDate, endDate],
                d => moment(d, inputDateFormat));
            return start.isBefore(end);
        },
        messageOnBroken: 'startDate must be before endDate'
    })];

    runQuery(parameters, queries.findAllSessions, res, next, true, contracts);
});

// Get 'heavy' session metadata for a specific session
router.get('/:id', function(req, res, next) {
    runQuery([input.sessionId(req.params.id)], queries.getSessionMeta, res, next);
});

let validateTraceName = function(input) {
    return input === 'global' || validation.integer(input);
};

let postProcessTraceName = function(input) {
    if (input !== undefined)
        return input === 'global' ? 'global' : parseInt(input, 10);
};

router.get('/:id/behavior', function(req, res, next) {
    let parameters = [
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
    let parameters = [
        input.sessionId(req.params.id),
        new Parameter({
            name: 'name',
            rawInput: req.query.name,
            validate: validateTraceName,
            errorMessage: 'Invalid trace name',
            optional: true,
            postprocess: postProcessTraceName
        })
    ];

    runQuery(parameters, queries.getTimeline, res, next);
});

router.get('/:id/volume/:index', function(req, res, next) {
    let parameters = [
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
        console.log(err);
    });
});

module.exports = router;
