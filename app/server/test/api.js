const expect = require('chai').expect;
const request = require('supertest');
const _ = require('lodash');
const moment = require('moment');

const queries = require('../src/queries.js');
const util = require('./_util.js');

// NOTE: We are making sure that the response decoration (general response
// structure, HTTP status codes) are being sent as expected. This is NOT for
// validating the core content of the response. That should be taken care of
// in queries.js.

describe('API v1', function() {
    let app;
    before(function createServer() {
        return util.serverFactory().then(function(serverApp) {
            app = serverApp.listen(util.TESTING_PORT);
        });
    });
    after(function closeConnections(done) {
        util.closeConnections(app, done);
    });

    const routePrefix = '/api/v1';
    describe('sessions', function() {
        describe(`GET ${routePrefix}/session`, function() {
            it('should respond with paginated data when given valid input', function() {
                const expectedStatus = 200;

                return request(app)
                    .get(routePrefix + '/session')
                    .expect('Content-Type', /json/) // Expect JSON response
                    .expect(expectedStatus)
                    .expect(function(res) {
                        // Paginated data comes with a `size` property. Ensure
                        // the value of that property equals the length of the
                        // data
                        expect(res.body.size).to.equal(res.body.data.length,
                            'unexpected "size" property on paginated JSON data');

                        // HTTP status code should be mirrored in response body
                        expect(res.body.status).to.equal(expectedStatus);
                        // 'start' must be a positive integer
                        expect(res.body.start).to.be.at.least(0, 'start was negative');
                    });
            });

            it('should correct invalid start and limits', function() {
                return request(app)
                    .get(routePrefix + '/session?start=-1&limit=-1')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function(res) {
                        expect(res.body.start).to.equal(0);
                        expect(res.body.size).to.be.above(0);
                    });
            });

            it('should accept start and end date ranges', function() {
                const test = this;

                let startDate, endDate;
                const start = 0, limit = 20;

                const formatDate = (date) => moment(date).format('YYYY-MM-DD');

                return queries.findAllSessions(start, limit).then(function(sessions) {
                    if (sessions.length < 2) return test.skip();

                    startDate = sessions[sessions.length / 2].start_time;
                    endDate = sessions[0].start_time;

                    return queries.findAllSessions(start, limit, startDate, endDate);
                }).then(function(sessions) {
                    return request(app)
                        .get(routePrefix + '/session?startDate=' + formatDate(startDate) + '&endDate=' + formatDate(endDate))
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.size).to.equal(sessions.length);
                        });
                });
            });

            it('should reject an end date that is before the start date', function() {
                return request(app)
                    .get(routePrefix + '/session?startDate=2017-01-02&endDate=2017-01-01')
                    .expect('Content-Type', /json/)
                    .expect(400);
            });

            it('should accept the animal query parameter', function() {
                // Basically what we're trying to do here is assert that the
                // amount of sessions returned from queries.findAllSessions with
                // the animal parameter included has the same length as the
                // API response data

                const start = 0, limit = 20;
                let animal = null;
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    animal = sessions[0].Animal;
                    return queries.findAllSessions(start, limit, undefined, undefined, animal);
                }).then(function(sessions) {
                    const size = sessions.length;
                    const animal = sessions[0].Animal;

                    return request(app)
                        .get(routePrefix + `/session?start=${start}&limit=${limit}&animal=${animal}`)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.data.length).to.equal(size);
                        });
                });
            });
        });

        describe(`GET ${routePrefix}/session/dates`, function() {
            it('should respond with an array of ISO-8601-formatted dates', function() {
                return request(app)
                    .get(routePrefix + '/session/dates')
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        const format = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
                        expect(Array.isArray(res.body.data)).to.be.true;
                        for (const dateStr of res.body.data) {
                            expect(moment(dateStr, format, true).isValid()).to.be.true;
                        }
                    });
            });
        });

        describe(`GET ${routePrefix}/session/:id`, function() {
            it('should respond with a body whose data field is an object', function() {
                return testIdEndpoint(app, (id) => `${routePrefix}/session/${id}`);
            });

            it('should respond with a 404 when a non-existent ID is passed', function() {
                return expectErrorResponse(app, `${routePrefix}/session/i_dont_exist`, 404);
            });
        });

        describe(`GET ${routePrefix}/session/:id/behavior`, function() {
            it('should respond successfully with a valid ID', function() {
                const expectedStatus = 200;

                // Retrieve the very first session and test the API using that ID
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    const id = sessions[0]._id;
                    return request(app)
                        .get(`${routePrefix}/session/${id}/behavior`)
                        .expect(expectedStatus)
                        .expect(function(res) {
                            expect(Array.isArray(res.body.data)).to.be.true;
                        });
                });
            });
        });

        describe(`GET ${routePrefix}/session/:id/timeline`, function() {
            it('should return only trace names when the names paramter is not present', function() {
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    const id = sessions[0]._id;
                    return request(app)
                        .get(`${routePrefix}/session/${id}/timeline`)
                        .expect(200);
                });
            });
        });

        describe(`GET ${routePrefix}/session/:id/timeline/:traceId`, function() {
            it('should return actual trace data when requested', function() {
                let id;
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    id = sessions[0]._id;
                    return queries.getTimeline(id);
                }).then(function(docs) {
                    return request(app)
                        .get(`${routePrefix}/session/${id}/timeline/${docs[0]._id}`)
                        .expect(200)
                        .expect((res) => {
                            expect(res.body.data).to.have.all.keys(
                                ['_id', 'maskName', 'maskF', 'srcID']);
                        });
                });
            });
        });

        describe(`GET ${routePrefix}/session/:id/volume`, function() {
            it('should return a buffer', function() {
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    const id = sessions[0]._id;

                    return request(app)
                        .get(`${routePrefix}/session/${id}/volume/100`)
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
        describe(`GET ${routePrefix}/animal`, () => {
            it('should return an array of unique animals', () => {
                return request(app)
                    .get(`${routePrefix}/animal`)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect((res) => {
                        const data = res.body.data;
                        expect(Array.isArray(data)).to.be.true;
                        // Data should be unique
                        expect(_.uniq(data)).to.deep.equal(data);
                    });
            });
        });
    });
});

const binaryParser = function(res, callback) {
    res.setEncoding('binary');
    res.data = '';
    res.on('data', chunk => {
        res.data += chunk;
    });
    res.on('end', () => {
        callback(null, new Buffer(res.data, 'binary'));
    });
};

const testIdEndpoint = function(app, formatEndpoint) {
    const expectedStatus = 200;

    // Retrieve the very first session and test the API using that ID
    return queries.findAllSessions(0, 1).then(function(sessions) {
        const id = sessions[0]._id;
        return request(app)
            .get(formatEndpoint(id))
            .expect(expectedStatus)
            .expect(function(res) {
                expect(res.body.data).to.be.an('object');
            });
    });
};

const expectErrorResponse = function(app, path, expectedStatus) {
    return request(app)
        .get(path)
        // Expect JSON as always
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .expect(function(res) {
            // Test format of response body
            expect(res.body.status).to.equal(expectedStatus);
            validateError(res.body.error);
        });
};

const validateError = function(errorObject) {
    expect(errorObject).to.not.be.undefined;
    expect(errorObject.msg).to.not.be.undefined;
    expect(errorObject.data).to.not.be.undefined;
};
