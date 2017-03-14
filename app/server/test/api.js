let assert = require('assert');
let request = require('supertest');
let _ = require('lodash');
let db = require('../src/database.js');
let queries = require('../src/queries.js');
let util = require('./_util.js');

// NOTE: We are making sure that the response decoration (general response
// structure, HTTP status codes) are being sent as expected. This is NOT for
// validating the core content of the response. That should be taken care of
// in queries.js.

describe('API v1', function() {
    let app;
    beforeEach(function createServer() {
        return util.serverFactory().then(function(serverApp) {
            app = serverApp.listen(util.TESTING_PORT);
        });
    });
    afterEach(function closeConnections(done) {
        util.closeConnections(app, done);
    });

    let routePrefix = '/api/v1';
    describe('sessions', function() {
        describe(`GET ${routePrefix}/session`, function() {
            it('should respond with paginated data when given valid input', function() {
                let expectedStatus = 200;

                return request(app)
                    .get(routePrefix + '/session')
                    .expect('Content-Type', /json/) // Expect JSON response
                    .expect(expectedStatus)
                    .expect(function(res) {
                        // Paginated data comes with a `size` property. Ensure
                        // the value of that property equals the length of the
                        // data
                        assert.equal(res.body.size, res.body.data.length,
                            'unexpected "size" property on paginated JSON data');

                        // HTTP status code should be mirrored in response body
                        assert.equal(res.body.status, expectedStatus);
                        // 'start' must be a positive integer
                        assert.ok(res.body.start >= 0, 'start was negative');
                    });
            });

            it('should correct invalid start and limits', function() {
                return request(app)
                    .get(routePrefix + '/session?start=-1&limit=-1')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function(res) {
                        assert.strictEqual(res.body.start, 0);
                        assert.ok(res.body.size > 0);
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
                let expectedStatus = 200;

                // Retrieve the very first session and test the API using that ID
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    let id = sessions[0]._id;
                    return request(app)
                        .get(`${routePrefix}/session/${id}/behavior`)
                        .expect(expectedStatus)
                        .expect(function(res) {
                            assert.ok(typeof res.body.data === 'object');
                        });
                });
            });
            it('should respond with only the requested event type', function() {
                let expectedStatus = 200;
                // Space before 'lick left' is intentional, test trimming
                let eventTypes = [' lick left', 'lick right'];
                let eventTypesCsv = _.join(eventTypes, ',');

                // Retrieve the very first session and test the API using that ID
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    let id = sessions[0]._id;
                    return request(app)
                        .get(`${routePrefix}/session/${id}/behavior?types=${eventTypesCsv}`)
                        .expect(expectedStatus)
                        .expect(function(res) {
                            assert.ok(typeof res.body.data === 'object');
                            assert.equal(Object.keys(res.body.data).length, eventTypes.length);
                        });
                });
            });
            it('should 400 with an invalid behaviors', function() {
                let expectedStatus = 400;
                // Space before 'lick left' is intentional, test trimming
                let eventTypes = ['!something_invalid!', '__other$@#'];
                let eventTypesCsv = _.join(eventTypes, ',');

                // Retrieve the very first session and test the API using that ID
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    let id = sessions[0]._id;
                    return request(app)
                        .get(`${routePrefix}/session/${id}/behavior?types=${eventTypesCsv}`)
                        .expect(expectedStatus)
                        .expect(function(res) {
                            assert.strictEqual(res.body.data, undefined);
                            assert.notStrictEqual(res.body.error, undefined);
                        });
                });
            });
            it('should 404 with valid, but non-existent behaviors', function() {
                let expectedStatus = 404;

                // One exists, one doesn't
                let eventTypes = ['lick left', 'something else'];
                let eventTypesCsv = _.join(eventTypes, ',');

                // Retrieve the very first session and test the API using that ID
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    let id = sessions[0]._id;
                    return request(app)
                        .get(`${routePrefix}/session/${id}/behavior?types=${eventTypesCsv}`)
                        .expect(expectedStatus)
                        .expect(function(res) {
                            assert.strictEqual(res.body.data, undefined);
                            assert.notStrictEqual(res.body.error, undefined);
                        });
                });
            });
        });

        describe(`GET ${routePrefix}/session/:id/timeline`, function() {
            it('should return only trace names when the names paramter is not present', function() {
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    let id = sessions[0]._id;
                    return request(app)
                        .get(`${routePrefix}/session/${id}/timeline`)
                        .expect(200);
                });
            });

            it('should return actual trace data when requested', function() {
                let id;
                return queries.findAllSessions(0, 1).then(function(sessions) {
                    id = sessions[0]._id;
                    return queries.getTimeline(id);
                }).then(function(traceNames) {
                    let names = traceNames.slice(0, 5);
                    return request(app)
                        .get(`${routePrefix}/session/${id}/timeline?names=${_.join(names, ',')}`)
                        .expect(200);
                });
            });
        });
    });
});

let testIdEndpoint = function(app, formatEndpoint) {
    let expectedStatus = 200;

    // Retrieve the very first session and test the API using that ID
    return queries.findAllSessions(0, 1).then(function(sessions) {
        let id = sessions[0]._id;
        return request(app)
            .get(formatEndpoint(id))
            .expect(expectedStatus)
            .expect(function(res) {
                assert.ok(typeof res.body.data === 'object');
            });
    });
}

let expectErrorResponse = function(app, path, expectedStatus) {
    return request(app)
        .get(path)
        // Expect JSON as always
        .expect('Content-Type', /json/)
        .expect(expectedStatus)
        .expect(function(res) {
            // Test format of response body
            assert.equal(res.body.status, expectedStatus);
            validateError(res.body.error);
        });
}

let validateError = function(errorObject) {
    assert.ok(errorObject !== undefined, 'error was undefined');
    assert.ok(errorObject.msg !== undefined, 'error message was undefined');
    assert.ok(errorObject.data !== undefined, 'error data was undefined');
};
