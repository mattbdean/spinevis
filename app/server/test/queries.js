let assert = require('assert');
let _ = require('lodash');
let db = require('../src/database.js');
let queries = require('../src/queries.js');

/**
 * Helper method. Gets the first session via findAllSession() and returns its
 * _id.
 */
let getFirstSessionId = function() {
    return queries.findAllSessions(0, 1)
    .then(function(sessions) {
        return sessions[0]._id;
    });
}

describe('queries', function() {
    before(function mongoConnect() {
        // Change to MODE_TEST when 'spinevis_test' database is ready
        return db.connect(db.MODE_PRODUCTION);
    });

    describe('findAllSessions()', function() {
        it('should find only appropriate session metadata', function() {
            return queries.findAllSessions(0, 20).then(function(sessions) {
                // For each document ensure that only specific data is returned
                let approvedKeys = ['_id', 'start_time', 'end_time', 'Animal', 'Run', 'nSamples', 'volRate'];

                for (let session of sessions) {
                    // Make sure all keys in the object are in the above array
                    for (let key of Object.keys(session)) {
                        assert.ok(approvedKeys.includes(key), `Key '${key}' is unexpected, session ID '${session._id}'`);
                    }

                    // Make sure all expected keys have defined values
                    for (let key of approvedKeys) {
                        assert.ok(session[key] !== undefined, `Key '${key}' is undefined`);
                    }
                }
            });
        });
    });

    describe('getSessionMeta()', function() {
        it('should return only one session', function() {
            let _id = null;

            return getFirstSessionId()
            .then(function(id) {
                _id = id;
                return queries.getSessionMeta(id);
            }).then(function(session) {
                // Make sure the query returns an object with a matching _id
                assert.equal(typeof session, 'object')
                assert.equal(session._id, _id);

                // Global fluorescense trace array must be equal in length to
                // the relative time array
                assert.equal(session.globalTC.length, session.relTimes.length);
            });
        });
    });

    describe('sessionExists()', function() {
        it('should return true for existing IDs', function() {
            return getFirstSessionId()
            .then(function(id) {
                return queries.sessionExists(id);
            }).then(function(exists) {
                assert.ok(exists, 'Did not find existing file');
            });
        });

        it('should return false for non-existent IDs', function() {
            return queries.sessionExists('i_dont_exist').then(function(exists) {
                assert.ok(!exists, 'Found non-existent session');
            });
        });
    });

    describe('getTimeline()', function() {
        it('should return an object mapping traces to arrays of indexes to display', function() {
            return getFirstSessionId().then(function(id) {
                return queries.getTimeline(id);
            }).then(function(timelineData) {
                assert.strictEqual(typeof timelineData, 'object');

                let traceNames = Object.keys(timelineData.traces);

                for (let name of traceNames) {
                    let trace = timelineData.traces[name];
                    assert.ok(Array.isArray(trace));
                }

                let globalF = timelineData.traces.global;
                assert.notStrictEqual(globalF, undefined);
                assert.strictEqual(timelineData.start, 0);
                assert.strictEqual(timelineData.size, timelineData.traces.global.length);

                for (let i = 0; i < timelineData.traces.length; i++) {
                    assert.ok(typeof timelineData[i] === 'number');
                }
            });
        });

        it('should return a percentage of the raw timeline', function() {
            let actualSamples, expectedSamples, resolution = 25;

            return queries.findAllSessions(0, 1).then(function(sessions) {
                let session = sessions[0];
                actualSamples = session.nSamples;
                expectedSamples = Math.floor(actualSamples / (100 / resolution));

                return queries.getTimeline(session._id, resolution);
            }).then(function(timelineData) {
                assert.strictEqual(timelineData.start, 0);

                for (let traceName of Object.keys(timelineData.traces)) {
                    let trace = timelineData.traces[traceName];
                    assert.ok(Array.isArray(trace));
                    // May be off by 1 in case the algorithm can't break the
                    // timeline data into even chunks
                    assert.ok(trace.length === expectedSamples || trace.length === expectedSamples + 1);
                }
            });
        });

        it('should pay attention to start and end parameters', function() {
            let start = 1000, end = 1050, bufferMult = 2;
            let expectedSamples = (end - start) + ((end - start) * (bufferMult * 2));

            return getFirstSessionId().then(function(id) {
                return queries.getTimeline(id, 100, start, end, bufferMult);
            }).then(function(timelineData) {
                assert.strictEqual(timelineData.start, start - (bufferMult * (end - start)));

                for (let traceName of Object.keys(timelineData.traces)) {
                    let trace = timelineData.traces[traceName];
                    assert.ok(Array.isArray(trace));
                    assert.strictEqual(trace.length, expectedSamples);
                }
            });
        });

        it('should only include the buffer when asked', function() {
            let start = 1000, end = 1050, bufferMult = 2;
            let expectedSamples = (end - start) * bufferMult;
            let direction = 'left';

            return getFirstSessionId().then(function(id) {
                return queries.getTimeline(id, 100, start, end, bufferMult, direction);
            }).then(function(timelineData) {
                assert.strictEqual(timelineData.start, start - ((end - start) * bufferMult));
                assert.strictEqual(timelineData.size, (end - start) * bufferMult);
            });
        });
    });

    describe('getBehavior()', function() {
        it('should return an object mapping behavior events to timepoint indexes', function() {
            return getFirstSessionId().then(function(id) {
                return queries.getBehavior(id);
            }).then(function(behaviorData) {
                for (let key of Object.keys(behaviorData)) {
                    // Make sure we are always returning an array
                    assert.ok(Array.isArray(behaviorData[key]));
                }
            });
        });

        it('should only return events which are asked for', function() {
            let events = ['lick left', 'lick right'];

            return getFirstSessionId().then(function(id) {
                return queries.getBehavior(id, events);
            }).then(function(behaviorData) {
                let dataKeys = Object.keys(behaviorData);
                // Lengths should be the same
                assert.ok(dataKeys.length === events.length);

                // Make sure that every event that was requested was returned
                for (let event of events) {
                    assert.ok(dataKeys.includes(event));
                }
            });
        });

        it('should report missing when one of the behaviors cannot be found', function() {
            let events = ['lick left', 'something else that doesn\'t exist', 'lick right'];

            return getFirstSessionId().then(function(id) {
                return queries.getBehavior(id, events);
            }).then(function(behaviorData) {
                assert.fail(undefined, undefined, 'should not have reached here');
            }).catch(function(err) {
                assert.equal(err.type, queries.ERROR_MISSING);
                // events[1] will not have any data, expect that the only
                // value in the error's 'types' array will be this value
                assert.deepStrictEqual(err.data, {types: [events[1]]});
            });
        });
    });
});
