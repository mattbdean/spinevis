const router = require('express').Router();

const queries = require('../../queries.js');
const runQuery = require('./util.js').runQuery;

router.get('/', (req, res, next) => {
    runQuery([], queries.getAllAnimals, res, next);
});

module.exports = router;

