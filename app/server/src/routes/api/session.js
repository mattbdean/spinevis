let express = require('express');
let router = express.Router();
let queries = require('../../queries.js');
let responses = require('./responses.js');
let param = require('./parameter.js');
let Parameter = param.Parameter;
let Contract = param.Contract;
let validation = require('../validation.js');
let _ = require('lodash');

/** Maximum sessions returned at one time */
const MAX_SESSION_DATA = 100;
const BUFFER_MULT_MAX = 3;

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

/** Function to generate a function to vaildate the 'start' pagination property */
let genStartValidationFn = function(input) {
    return function(start) {
        return validation.integer(input, 0, 0);
    };
};

/** Function to generate a function to vaildate the 'limit' pagination property */
let genLimitValidationFn = function(input) {
    return function(limit) {
        return validation.integer(limit, 20, 1, MAX_SESSION_DATA);
    };
};

// Get 'light' session metadata for all sessions
router.get('/', function(req, res, next) {
    // Define our parameters and their values/locations, and what should be
    // done if they're found to be invalid
    let parameters = [
        new Parameter(
            'start',
            req.query.start,
            genStartValidationFn(req.query.start),
            {msg: 'Invalid start', status: 400}
        ),
        new Parameter(
            'limit',
            req.query.limit,
            genLimitValidationFn(req.query.limit),
            {msg: 'Invalid limit', status: 400}
        )
    ];

    runQuery(parameters, queries.findAllSessions, res, next, true);
});

// Get 'heavy' session metadata for a specific session
router.get('/:id', function(req, res, next) {
    runQuery([param.sessionId(req.params.id)], queries.getSessionMeta, res, next);
});

// Get timeline data
router.get('/:id/timeline', function(req, res, next) {
    let parameters = [param.sessionId(req.params.id)];
    let contracts = [];

    // Optional query parameter
    if (req.query.resolution !== undefined && req.query.resolution.trim() !== '') {
        parameters.push(param.integerStrict('resolution', req.query.resolution, 1, 100));
    } else {
        parameters.push(param.defaultValue('resolution', 100));
    }

    // start and end are optional parameters as well
    if (req.query.start !== undefined && req.query.start.trim() !== '' &&
        req.query.end !== undefined && req.query.end.trim() !== '') {

        parameters.push(param.integerStrict('start', req.query.start, 0));
        parameters.push(param.integerStrict('end', req.query.end, 1));

        contracts.push(new Contract(
            'start', 'end',
            function(start, end) { return start < end; },
            'start must be less than end'
        ));

        if (req.query.bufferMult !== undefined && req.query.bufferMult.trim() !== '') {
            parameters.push(param.integerStrict('bufferMult', req.query.bufferMult, 0, BUFFER_MULT_MAX));

            if (req.query.extendBuffer !== undefined && req.query.extendBuffer.trim() !== '') {
                let possibleValues = ['left', 'right'];
                parameters.push(new Parameter(
                    'extendBuffer',
                    req.query.extendBuffer,
                    (value) => validation.enumerated(possibleValues, value),
                    {msg: 'extendBuffer must be one of ' + possibleValues, status: 400}
                ));
            }
        }
    }

    runQuery(parameters, queries.getTimeline, res, next, false, contracts);
});

router.get('/:id/behavior', function(req, res, next) {
    let parameters = [param.sessionId(req.params.id)];

    // Define an optional parameter
    if (req.query.types !== undefined && req.query.types.trim() !== '') {
        parameters.push(new Parameter(
            'eventTypes',
            _.map(req.query.types.split(','), type => type.trim()),
            validation.alphabeticWords,
            {msg: 'Invaild event type(s)', status: 400}
        ));
    }
    runQuery(parameters, queries.getBehavior, res, next);
});

router.get('/:id/trace', function(req, res, next) {
    let parameters = [param.sessionId(req.params.id)];

    // `names` is optional
    if (req.query.names !== undefined && req.query.names.trim() !== '') {
        let values = _.map(req.query.names.split(','), name => name.trim());
        parameters.push(param.integerStrict('names', values, 0));
    }

    runQuery(parameters, queries.getTraces, res, next);
});

module.exports = router;
