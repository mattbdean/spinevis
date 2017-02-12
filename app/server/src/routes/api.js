let express = require('express');
let router = express.Router();

router.get('/foo', function(req, res, next) {
    res.json({test: true});
});

// Error handling
router.use('/', function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(err);
});

module.exports = router;
