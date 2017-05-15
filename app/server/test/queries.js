let expect = require('chai').expect;
let _fail = require('assert').fail;
let db = require('../src/database.js');
let queries = require('../src/queries.js');

describe('queries', function() {
    let firstSession = null;
    let firstSessionId = null;

    before(function mongoConnect() {
        // Change to MODE_TEST when 'spinevis_test' database is ready
        return db.connect(db.MODE_PRODUCTION).then(function() {
            return queries.findAllSessions(0, 20);
        }).then(function(data) {
            if (data.length === 0)
                throw new Error('There are no sessions in the database!');

            firstSession = data[0];
            firstSessionId = firstSession._id;
        });
    });

    describe('findAllSessions()', function() {
        it('should find only appropriate session metadata', function() {
            return queries.findAllSessions(0, 20).then(function(sessions) {
                // For each document ensure that only specific data is returned
                let approvedKeys = ['_id', 'start_time', 'end_time', 'Animal', 'Run', 'name', 'nSamples', 'volRate', 'FOV'];

                for (let session of sessions) {
                    // Make sure all keys in the object are in the above array
                    for (let key of Object.keys(session)) {
                        expect(approvedKeys.includes(key)).to.equal(true,
                            `Key '${key}' is unexpected, session ID '${session._id}'`);
                    }

                    // Make sure all expected keys have defined values
                    for (let key of approvedKeys) {
                        expect(session[key]).to.exist;
                    }
                }
            });
        });

        it('should return entries in descending order by start time', function() {
            return queries.findAllSessions(0, 20).then(function(sessions) {
                let lastStart = new Date(sessions[0].start_time).getTime();
                for (let i = 1; i < sessions.length; i++) {
                    let thisStart = new Date(sessions[i].start_time).getTime();
                    expect(thisStart).to.be.below(lastStart);
                    lastStart = thisStart;
                }
            });
        });

        let getMiddleSession = (test, start = 0, limit = 20) =>
            queries.findAllSessions(start, limit).then(function(sessions) {
                if (sessions.length === 1) return test.skip();
                return sessions[sessions.length / 2];
            });

        it('should allow passing only startDate', function() {
            let startDate;
            return getMiddleSession(this).then(function(session) {
                startDate = session.start_time;

                return queries.findAllSessions(0, 20, startDate);
            }).then(function(sessions) {
                for (let session of sessions) {
                    expect(session.start_time.getTime()).to.be.at.least(startDate.getTime());
                }
            });
        });

        it('should allow passing only endDate', function() {
            let endDate;
            return getMiddleSession(this).then(function(session) {
                endDate = session.start_time;

                return queries.findAllSessions(0, 20, undefined, endDate);
            }).then(function(sessions) {
                for (let session of sessions) {
                    expect(session.start_time.getTime()).to.be.below(endDate.getTime());
                }
            });
        });

        it('should return entires in only the requested range', function() {
            let unfilteredLength, expectedLength, startDate, endDate;
            const test = this;
            return queries.findAllSessions(0, 20).then(function(sessions) {
                if (sessions.length === 1) {
                    test.skip();
                }
                startDate = sessions[sessions.length / 2].start_time;
                endDate = sessions[0].start_time;

                unfilteredLength = sessions.length;
                expectedLength = sessions.length / 2;

                return queries.findAllSessions(0, 20, startDate, endDate);
            }).then(function(sessions) {
                expect(sessions.length).to.equal(expectedLength);
            });
        });

        it('should allow filtering by animal name', function() {
            const animal = firstSession.Animal;

            return queries.findAllSessions(0, 20, undefined, undefined, animal)
            .then(function(sessions) {
                expect(sessions.length).to.be.above(0);
                for (let s of sessions) {
                    expect(s.Animal).to.equal(animal);
                }
            });
        });
    });

    describe('getSessionDates()', function() {
        it('should return an array of dates', function() {
            return queries.getSessionDates().then(function(result) {
                expect(Array.isArray(result)).to.be.true;

                for (const r of result) {
                    expect(r).to.be.an.instanceof(Date);
                }
            });
        });
    });

    describe('getSessionMeta()', function() {
        it('should return only one session', function() {
            let _id = firstSessionId;

            return queries.getSessionMeta(firstSessionId).then(function(session) {
                // Make sure the query returns an object with a matching _id
                expect(session).to.be.an('object');
                expect(session._id).to.equal(_id);
            });
        });
    });

    describe('sessionExists()', function() {
        it('should return true for existing IDs', function() {
            return queries.sessionExists(firstSessionId).then(function(exists) {
                expect(exists).to.be.true;
            });
        });

        it('should return false for non-existent IDs', function() {
            return queries.sessionExists('i_dont_exist').then(function(exists) {
                expect(exists).to.be.false;
            });
        });
    });

    describe('getBehavior()', function() {
        it('should return an object mapping behavior events to timepoint indexes', function() {
            return queries.getBehavior(firstSessionId).then(function(behaviorData) {
                for (let key of Object.keys(behaviorData)) {
                    // Make sure we are always returning an array
                    expect(Array.isArray(behaviorData[key])).to.be.true;
                }
            });
        });

        it('should only return events which are asked for', function() {
            let events = ['lick left', 'lick right'];

            return queries.getBehavior(firstSessionId, events).then(function(behaviorData) {
                let dataKeys = Object.keys(behaviorData);
                // Lengths should be the same
                expect(dataKeys).to.have.lengthOf(events.length);

                // Make sure that every event that was requested was returned
                for (let event of events) {
                    expect(dataKeys).to.include(event);
                }
            });
        });

        it('should report missing when one of the behaviors cannot be found', function() {
            let events = ['lick left', 'something else that doesn\'t exist', 'lick right'];

            return queries.getBehavior(firstSessionId, events).then(function() {
                _fail(undefined, undefined, 'should not have reached here');
            }).catch(function(err) {
                expect(err.type).to.equal(queries.ERROR_MISSING);
                // events[1] will not have any data, expect that the only
                // value in the error's 'types' array will be this value
                expect(err.data).to.deep.equal({
                    types: [events[1]]
                });
            });
        });
    });

    describe('getTimeline()', function() {
        it('should return an array of objects containing the ID and name of each mask when given only the session ID', function() {
            return queries.getTimeline(firstSessionId).then(function(docs) {
                expect(Array.isArray(docs)).to.be.true;
                expect(docs).to.have.length.above(0);

                for (const doc of docs) {
                    expect(doc).to.be.an('object');
                    expect(doc._id).to.exist;
                    expect(doc.maskName).to.exist;
                }
            });
        });

        it('should return all available data when also given a trace ID', function() {
            let requestedId;
            let sessionId = firstSessionId;

            return queries.getTimeline(sessionId).then(function(traces) {
                requestedId = traces[0]._id;
                return queries.getTimeline(sessionId, requestedId);
            }).then(function(traceData) {
                expect(traceData).to.be.an('object');
                expect(traceData).to.have.all.keys(['_id', 'maskF', 'maskName', 'srcID']);
                // requestedId and traceData._id are ObjectIDs, convert them to
                // strings before comparison
                expect(traceData._id.toString()).to.equal(requestedId.toString());
            });
        });
    });

    describe('getVolumes()', function() {
        it('should return a Buffer of data', () => {
            return queries.getVolumes(firstSessionId, 100).then(function(result) {
                expect(result instanceof Buffer).to.be.true;
            });
        });
    });
});
