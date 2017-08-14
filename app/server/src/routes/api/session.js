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
const runQuery = require('./util.js').runQuery;

/** Maximum sessions returned at one time */
const MAX_SESSION_DATA = 100;

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
                (d) => moment(d, inputDateFormat));
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
        input.sessionId(req.params.id)
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
