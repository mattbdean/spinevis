let assert = require('assert');
let request = require('supertest');
let db = require('../src/database.js');
let queries = require('../src/queries.js');
const TESTING_PORT = 8081;

// NOTE: We are making sure that the response decoration (general response
// structure, HTTP status codes) are being sent as expected. This is NOT for
// validating the core content of the response. That should be taken care of
// in queries.js.

describe('API v1', function() {
    let app;
    beforeEach(function createServer() {
        return require('../src/server.js')().then(function(serverApp) {
            app = serverApp.listen(TESTING_PORT);
        });
    });
    afterEach(function closeConnections(done) {
        db.close().then(function() {
            app.close(done)
        });
    });

    let routePrefix = '/api/v1';
    describe('trials', function() {
        describe(`GET ${routePrefix}/trial`, function() {
            it('should respond with paginated data when given valid input', function() {
                let expectedStatus = 200;

                return request(app)
                    .get(routePrefix + '/trial')
                    .expect('Content-Type', /json/) // Expect JSON response
                    .expect(expectedStatus)
                    .expect(function(res) {
                        assert.equal(res.body.size, res.body.data.length,
                            'unexpected "size" property on paginated JSON data');

                        // HTTP status code should be mirrored in response body
                        assert.equal(res.status, expectedStatus);
                        // 'start' must be a positive integer
                        assert.ok(res.body.start >= 0, 'start was negative');
                    });
            });

            it('should respond with 400 when given an invalid limit', function() {
                return expectErrorResponse(app, `${routePrefix}/trial?limit=-1`, 400);
            });

            it('should respond with 400 when given an invalid start', function() {
                return expectErrorResponse(app, `${routePrefix}/trial?start=-1`, 400);
            });
        });

        describe(`GET ${routePrefix}/trial/:id`, function() {
            it('should respond with a body whose data field is an object', function() {
                let expectedStatus = 200;

                // Retrieve the very first trial and test the API using that ID
                return queries.findAllTrials(0, 1).then(function(trials) {
                    let id = trials[0]._id;
                    return request(app)
                        .get(`${routePrefix}/trial/${id}`)
                        .expect(expectedStatus)
                        .expect(function(res) {
                            assert.ok(typeof res.body.data === 'object');
                        });
                });
            });
        });
    });
});

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
