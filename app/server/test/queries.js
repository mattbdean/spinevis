let db = require('../src/database.js');
let assert = require('assert');

describe('queries', function() {
    before(function mongoConnect() {
        // Change to MODE_TEST when 'spinevis_test' database is ready
        return db.connect(db.MODE_PRODUCTION);
    });

    let queries = require('../src/queries.js');

    it('should find only appropriate trial metadata', function() {
        return queries.findAllTrials().then(function(trials) {
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

    it('should return only one trial', function() {
        let id = null;
        return queries.findAllTrials()
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
