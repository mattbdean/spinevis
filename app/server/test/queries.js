let assert = require('assert');
let db = require('../src/database.js');
let queries = require('../src/queries.js');

describe('queries', function() {
    before(function mongoConnect() {
        // Change to MODE_TEST when 'spinevis_test' database is ready
        return db.connect(db.MODE_PRODUCTION);
    });

    describe('findAllTrials()', function() {
        it('should find only appropriate trial metadata', function() {
            return queries.findAllTrials(0, 20).then(function(trials) {
                // For each document ensure that only specific data is returned
                let approvedKeys = ['_id', 'start_time', 'end_time', 'Animal', 'Run', 'nSamples'];

                for (let trial of trials) {
                    // Make sure all keys in the object are in the above array
                    for (let key of Object.keys(trial)) {
                        assert.ok(approvedKeys.includes(key), `Key '${key}' is unexpected, trial ID '${trial._id}'`);
                    }

                    // Make sure all expected keys have defined values
                    for (let key of approvedKeys) {
                        assert.ok(trial[key] !== undefined, `Key '${key}' is undefined`);
                    }
                }
            });
        });
    });

    describe('getTrialMeta()', function() {
        it('should return only one trial', function() {
            let id = null;
            return queries.findAllTrials(0, 20)
            .then(function(trials) {
                id = trials[0]._id;
                return queries.getTrialMeta(trials[0]._id);
            }).then(function(trial) {
                // Make sure the query returns an object with a matching _id
                assert.equal(typeof trial, 'object')
                assert.equal(trial._id, id);
            });
        });
    });

    describe('trialExists()', function() {
        it('should return true for existing IDs', function() {
            return queries.findAllTrials(0, 1)
            .then(function(trials) {
                return queries.trialExists(trials[0]._id);
            }).then(function(exists) {
                assert.ok(exists, 'Did not find existing file');
            });
        });

        it('should return false for non-existant IDs', function() {
            return queries.trialExists('i_dont_exist').then(function(exists) {
                assert.ok(!exists, 'Found non-existent trial');
            });
        });
    });

    describe('getTimeline()', function() {
        it('should return only imaging events', function() {
            this.timeout(500000)
            return queries.findAllTrials(0, 2).then(function(trials) {
                let id = trials[1]._id;
                return queries.getTimeline(id).then(function(timelineData) {
                    for (let i = 0; i < timelineData; i++) {
                        assert.notEqual(timelineData[i].globalF, undefined);
                        assert.notEqual(timelienData[i].absTime, undefined);
                    }
                });
            });
        })
    })
});
