let assert = require('assert');
let request = require('supertest');
let queries = require('../src/queries.js');
let util = require('./_util.js');

describe('Public HTML endpoints', function() {
    let app;
    beforeEach(function createServer() {
        return util.serverFactory(false).then(function(serverApp) {
            app = serverApp.listen(util.TESTING_PORT);
        });
    });
    afterEach(function closeConnections(done) {
        util.closeConnections(app, done);
    });

    describe('sessions', function() {
        describe('GET /', function() {
            it('should respond with HTML', function() {
                return request(app)
                    .get('/')
                    .expect('Content-Type', /html/)
                    .expect(200)
            });
        });

        describe('GET /session/:id', function() {
            it('should respond with 200 OK when given an existing ID', function() {
                return queries.findAllSessions(0, 1)
                .then(function(sessions) {
                    let id = sessions[0]._id;
                    return request(app)
                        .get('/session/' + id)
                        .expect('Content-Type', /html/)
                        .expect(200)
                });
            });

            it('should respond with 404 Not Found when given a non-existent ID', function() {
                return request(app)
                    .get('/session/i_dont_exist')
                    .expect('Content-Type', /html/)
                    .expect(404)
            });
        });
    });

    describe('partials', function() {
        // Dynamically create tests for partials, make sure every partial in the
        // list responds withi 200 OK
        for (let partial of ['session-list', 'session-vis']) {
            describe('GET /partial/' + partial, function() {
                it('should respond with 200 OK', function() {
                    return request(app)
                        .get('/partial/' + partial)
                        .expect('Content-Type', /html/)
                        .expect(200)
                });
            });
        }
    });
});
