let express = require('express');
let router = express.Router();
let queries = require('../../queries.js');
let responses = require('./responses.js');

let input = require('../input');
let Parameter = input.Parameter;
let Contract = input.Contract;

let validation = input.validation;
let _ = require('lodash');

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
        contract.apply(parameters);
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
                return next(responses.error(err.msg, err.data, status));
            }
        }

        // We don't know how to handle this kind of error, send a 500 Internal
        // Server Error.
        return next(responses.error());
    });
};

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
        new Parameter(limit)
    ];

    runQuery(parameters, queries.findAllSessions, res, next, true);
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

router.get('/:id/volume', function(req, res, next) {
    // end is an optional integer parameter that must be greater than 1
    let end = input.integer('end', req.query.end, 1);
    end.optional = true;

    let parameters = [
        input.sessionId(req.params.id),
        // start is a required integer parameter with no default value that must
        // be greater than 0
        new Parameter(input.integer('start', req.query.start, 0)),
        new Parameter(end)
    ];

    let contracts = [];

    if (_.find(parameters, p => p.name === 'end').value !== undefined) {
        contracts.push( new Contract({
            p1Name: 'start',
            p2Name: 'end',
            verify: (start, end) => start <= end,
            messageOnBroken: 'start must be less than or greater than end'
        }) );
    }

    runQuery(parameters, queries.getVolumes, res, next, false, contracts);
});

module.exports = router;
