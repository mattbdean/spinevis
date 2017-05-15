const db = require('../src/database.js');
const queries = require('../src/queries.js');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const id = 'BMWR34:20160106:1:1';

const addQuery = function(suite, name, query) {
    return suite.add(name, {
        defer: true,
        fn: function(deferred) {
            query().then(function() {
                deferred.resolve();
            });
        }
    });
};

addQuery(suite, 'findAllSessions()', () => queries.findAllSessions(0, 20));
addQuery(suite, 'getSessionMeta()', () => queries.getSessionMeta(id));
addQuery(suite, 'sessionExists()', () => queries.sessionExists(id));
addQuery(suite, 'getTimeline()', () => queries.getTimeline(id));
addQuery(suite, 'getTimeline(\'global\')', () => queries.getTimeline(id, 'global'));
addQuery(suite, 'getBehavior()', () => queries.getBehavior(id));
addQuery(suite, 'getVolumes(one)', () => queries.getVolumes(id, 50));
addQuery(suite, 'getVolumes(many)', () => queries.getVolumes(id, 50, 150));

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
