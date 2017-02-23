let express = require('express');
let router = express.Router();
let queries = require('../../queries.js');
let responses = require('./responses.js');
let validation = require('../validation.js');

/** Maximum trials returned at one time */
const MAX_TRIAL_DATA = 100;

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

// Get 'light' trial metadata for all trials
router.get('/', function(req, res, next) {
    // One might assume that we could do something like this:
    //
    //     let whatever = parseInt(req.query.whatever) || defaultValue;
    //
    // but this does not account for the fact that if the user input is '0',
    // JavaScript sees this as a "falsey" value and will use the default value
    // instead.
    let start = validateInteger(req.query.start, 0);
    let limit = validateInteger(req.query.limit, 20, MAX_TRIAL_DATA);

    queries.findAllTrials(start, limit).then(function(trialInfo) {
        // Return the data in a format that lets the user know that this
        // endpoint is iterable
        res.json(responses.paginatedSuccess(trialInfo, limit, start));
    }).catch(function(err) {
        if (err.type && err.type === queries.ERROR_PAGINATION) {
            return next(responses.error(err.msg, err.data, 400));
        } else {
            return next(responses.error());
        }
    });
});

// Get 'heavy' trial metadata for a specific trial
router.get('/:id', function(req, res, next) {
    let id = req.params.id;

    if (!validation.trialId(id)) {
        return next(responses.error('Trial not found', {id: id}, 404));
    }

    queries.getTrialMeta(id).then(function(trial) {
        res.json(responses.success(trial));
    }).catch(function(err) {
        if (err.type && err.type === queries.ERROR_MISSING) {
            return next(responses.error(err.msg, err.data, 404));
        }

        return next(response.error());
    });
});

router.get('/:id/timeline', function(req, res, next) {
    let id = req.params.id;

    if (!validation.trialId(id)) {
        return next(responses.error('Trial not found', {id: id}, 404));
    }

    queries.getTimeline(id).then(function(result) {
        res.json(responses.success(result));
    }).catch(function(err) {
        if (err.type && err.type === queries.ERROR_MISSING) {
            return next(responses.error(err.msg, err.data, 404));
        }

        return next;
    });
});

module.exports = router;
