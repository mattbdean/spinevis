const expect = require('chai').expect;
const _ = require('lodash');
const moment = require('moment');
const supertest = require('supertest');

const RequestContext = require('./api-test.helper');
const createServer = require('../src/server');
const queries = require('../src/queries.js');

/* eslint-env node,mocha */

describe('API v1', () => {
    let app;
    let request;
    let FIRST_SESSION;

    before('create server', async () => {
        app = await createServer();
        request = new RequestContext(app);
        FIRST_SESSION = (await queries.findAllSessions(0, 1))[0];
    });

    describe('sessions', () => {
        describe('GET /api/v1/session', () => {
            it('should respond with paginated data when given valid input', () =>
                request.basic('/session', 200, () => {}).then((res) => {
                    // Paginated data comes with a `size` property. Ensure the
                    // value of that property equals the length of the data
                    expect(res.body.size).to.equal(res.body.data.length,
                        'unexpected "size" property on paginated JSON data');

                    // 'start' must be a positive integer
                    expect(res.body.start).to.be.at.least(0, 'start was negative');
                }));

            it('should correct invalid start and limits', async () => {
                const res = await request.spec({
                    relPath: '/session',
                    expectedStatus: 200,
                    query: { start: -1, limit: -1 }
                });
                expect(res.body.start).to.equal(0);
                expect(res.body.size).to.be.above(0);
            });

            it('should accept start and end date ranges', async function() {
                const test = this;

                const start = 0, limit = 20;
                const formatDate = (date) => moment(date).format('YYYY-MM-DD');

                const allSessions = await queries.findAllSessions(start, limit);
                // We need at least 2 sessions to do this test accurately
                if (allSessions.length < 2) return test.skip();

                const startDate = allSessions[allSessions.length / 2].start_time;
                const endDate = allSessions[0].start_time;

                const sessions = await queries.findAllSessions(start, limit, startDate, endDate);
                const response = await request.spec({
                    relPath: '/session',
                    query: {
                        startDate: formatDate(startDate),
                        endDate: formatDate(endDate)
                    },
                    expectedStatus: 200,
                    validate: (data) => {
                        expect(data.length).to.equal(sessions.length);
                    }
                });
                expect(response.body.size).to.equal(sessions.length);
            });

            it('should reject an end date that is before the start date', () =>
                request.spec({
                    relPath: '/session',
                    query: {
                        startDate: '2017-01-02',
                        endDate: '2017-01-01'
                    },
                    expectedStatus: 400
                })
            );

            it('should accept the animal query parameter', async () => {
                // Basically what we're trying to do here is assert that the
                // amount of sessions returned from queries.findAllSessions with
                // the animal parameter included has the same length as the
                // API response data

                const start = 0, limit = 20;
                const animal = FIRST_SESSION.Animal;
                const sessions = await queries.findAllSessions(start, limit, undefined, undefined, animal);

                return request.spec({
                    relPath: '/session',
                    query: { start, limit, animal },
                    expectedStatus: 200,
                    validate: (data) => {
                        expect(data.length).to.equal(sessions.length);
                    }
                });
            });
        });

        describe('GET /api/v1/session/dates', () => {
            it('should respond with an array of ISO-8601-formatted dates', () =>
                request.spec({
                    relPath: '/session/dates',
                    expectedStatus: 200,
                    validate: (data) => {
                        const format = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
                        expect(Array.isArray(data)).to.be.true;
                        for (const dateStr of data) {
                            expect(moment(dateStr, format, true).isValid()).to.be.true;
                        }
                    }
                })
            );
        });

        describe('GET /api/v1/session/:id', () => {
            it('should respond with a body whose data field is an object', async () => {
                // Retrieve the very first session and test the API using that ID
                return request.spec({
                    relPath: '/session/' + FIRST_SESSION._id,
                    expectedStatus: 200,
                    validate: (data) => {
                        expect(data).to.be.an('object');
                    }
                });
            });

            it('should respond with a 404 when a non-existent ID is passed', () =>
                request.basic('/session/i_dont_exist', 404)
            );
        });

        describe('GET /api/v1/session/:id/behavior', () => {
            it('should respond successfully with a valid ID', async () => {
                // Retrieve the very first session and test the API using that ID
                return request.spec({
                    relPath: `/session/${FIRST_SESSION._id}/behavior`,
                    expectedStatus: 200,
                    validate: (data) => {
                        expect(data).to.be.an('object');
                    }
                });
            });

            it('should respond with only the requested event types', () => {
                // Space before 'lick left' is intentional, test trimming
                const eventTypes = [' lick left', 'lick right'];

                return request.spec({
                    relPath: `/session/${FIRST_SESSION._id}/behavior`,
                    expectedStatus: 200,
                    query: { types: _.join(eventTypes, ',') },
                    validate: (data) => {
                        expect(data).to.be.an('object');
                        expect(Object.keys(data)).to.have.lengthOf(eventTypes.length);
                    }
                });
            });

            it('should 400 with an invalid behaviors', () => {
                return request.spec({
                    relPath: `/session/${FIRST_SESSION._id}/behavior`,
                    query: { types: _.join(['!something_invalid!', '__other$@#'], ',') },
                    expectedStatus: 400
                });
            });

            it('should 404 with valid, but non-existent behaviors', () => {
                // One exists, one doesn't
                const eventTypes = ['lick left', 'something else'];

                return request.spec({
                    relPath: `/session/${FIRST_SESSION._id}/behavior`,
                    expectedStatus: 404,
                    query: { types: _.join(eventTypes, ',') }
                });
            });
        });

        describe('GET /api/v1/session/:id/timeline', () => {
            it('should return only trace names when the names paramter is not present', () =>
                request.spec({
                    relPath: `/session/${FIRST_SESSION._id}/timeline`,
                    expectedStatus: 200
                })
            );
        });

        describe('GET /api/v1/session/:id/timeline/:traceId', () => {
            it('should return actual trace data when requested', async () => {
                const traceId = (await queries.getTimeline(FIRST_SESSION._id))[0]._id;
                return request.spec({
                    relPath: `/session/${FIRST_SESSION._id}/timeline/${traceId}`,
                    expectedStatus: 200,
                    validate: (data) => {
                        expect(data).to.have.all.keys(
                            ['_id', 'maskName', 'maskF', 'srcID']);
                    }
                });
            });
        });

        describe('GET /api/v1/session/:id/volume', () => {
            /** supertest middleware to parse a binary response into a Buffer */
            const binaryParser = function(res, callback) {
                res.setEncoding('binary');
                res.data = '';
                res.on('data', (chunk) => {
                    res.data += chunk;
                });
                res.on('end', () => {
                    callback(null, new Buffer(res.data, 'binary'));
                });
            };

            it('should return a buffer', () => {
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    const id = sessions[0]._id;

                    return supertest(app)
                        .get(`/api/v1/session/${id}/volume/100`)
                        .buffer()
                        .parse(binaryParser)
                        .expect(200)
                        .expect((res) => {
                            expect(res.body instanceof Buffer).to.be.true;
                        });
                });
            });
        });
    });

    describe('animal', () => {
        describe('GET /api/v1/animal', () => {
            it('should return an array of unique animals', () => {
                return request.basic('/animal', 200, (data) => {
                    expect(Array.isArray(data)).to.be.true;
                    // Data should be unique
                    expect(_.uniq(data)).to.deep.equal(data);
                });
            });
        });
    });
});
