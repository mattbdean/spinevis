let express = require('express');
let router = express.Router();
let queries = require('../../queries.js');
let responses = require('./responses.js');

// Get 'light' trial metadata for all trials
router.get('/', function(req, res, next) {
    queries.findAllTrials().then(function(trialInfo) {
        res.json(new responses.ApiSuccess(trialInfo));
    }).catch(function(err) {
        next(new responses.ApiError());
    });
});

// Get 'heavy' trial metadata for a specific trial
router.get('/:id', function(req, res, next) {
    let id = req.params.id;

    if (id === undefined || id === null || id.trim().length === 0) {
        return next(new responses.ApiError('Invalid ID', {id: id}, 400));
    }

    queries.getTrialMeta(id).then(function(trial) {
        res.json(new responses.ApiSuccess(trial));
    }).catch(function(err) {
        if (err.type && err.type === 'missing') {
            return next(new responses.ApiError('Unknown ID', {id: id}, 404))
        }
        // Generic response
        return next(new responses.ApiError());
    });
});

module.exports = router;
