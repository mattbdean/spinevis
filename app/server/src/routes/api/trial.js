let express = require('express');
let router = express.Router();
let queries = require('../../queries.js');

// Get 'light' trial metadata for all trials
router.get('/', function(req, res, next) {
    queries.findAllTrials().then(function(trialInfo) {
        res.json(trialInfo);
    }).catch(function(err) {
        next(err);
    });
});

// Get 'heavy' trial metadata for a specific trial
router.get('/:id', function(req, res, next) {
    let id = req.params.id;

    if (id === undefined || id === null || id.trim().length === 0) {
        return next('Invalid ID');
    }
    queries.getTrialMeta(id).then(function(trial) {
        res.json(trial);
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
