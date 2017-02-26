let db = require('../src/database.js');
let queries = require('../src/queries.js');
let Benchmark = require('benchmark');

let suite = new Benchmark.Suite();

let id = 'BMWR34:20160106:1:1';

let addQuery = function(suite, name, query) {
    return suite.add(name, {
        defer: true,
        fn: function(deferred) {
            query().then(function() {
                deferred.resolve();
            });
        }
    })
}

addQuery(suite, 'findAllSessions()', () => queries.findAllSessions(0, 20));
addQuery(suite, 'getSessionMeta()', () => queries.getSessionMeta(id));
addQuery(suite, 'sessionExists()', () => queries.sessionExists(id));
addQuery(suite, 'getTimeline()', () => queries.getTimeline(id));

suite.on('complete', function() {
    db.close();
})
.on('cycle', function(event) {
    // Show an analysis after completing the benchmark
    console.log(String(event.target));
});

db.connect(db.MODE_PRODUCTION).then(function() {
    suite.run({async: true});
});
