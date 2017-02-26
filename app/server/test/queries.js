let assert = require('assert');
let db = require('../src/database.js');
let queries = require('../src/queries.js');

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
            let id = null;
            return queries.findAllSessions(0, 20)
            .then(function(sessions) {
                id = sessions[0]._id;
                return queries.getSessionMeta(sessions[0]._id);
            }).then(function(session) {
                // Make sure the query returns an object with a matching _id
                assert.equal(typeof session, 'object')
                assert.equal(session._id, id);
            });
        });
    });

    describe('sessionExists()', function() {
        it('should return true for existing IDs', function() {
            return queries.findAllSessions(0, 1)
            .then(function(sessions) {
                return queries.sessionExists(sessions[0]._id);
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
        it('should return an array of global fluorescense values', function() {
            return queries.findAllSessions(0, 1).then(function(sessions) {
                let id = sessions[0]._id;
                return queries.getTimeline(id).then(function(timelineData) {
                    for (let i = 0; i < timelineData.length; i++) {
                        assert.ok(typeof timelineData[i] === 'number');
                    }
                });
            });
        })
    })
});
