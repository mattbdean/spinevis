let assert = require('assert');
let request = require('supertest');
let queries = require('../src/queries.js');
let util = require('./_util.js');

describe('Public HTML endpoints', function() {
    let app;
    beforeEach(function createServer() {
        return util.serverFactory().then(function(serverApp) {
            app = serverApp.listen(util.TESTING_PORT);
        });
    });
    afterEach(function closeConnections(done) {
        util.closeConnections(app, done);
    });

    describe('trials', function() {
        describe('GET /', function() {
            it('should respond with HTML', function() {
                return request(app)
                    .get('/')
                    .expect('Content-Type', /html/)
                    .expect(200)
            });
        });

        describe('GET /trial/:id', function() {
            it('should respond with 200 OK when given an existing ID', function() {
                return queries.findAllTrials(0, 1)
                .then(function(trials) {
                    let id = trials[0]._id;
                    return request(app)
                        .get('/trial/' + id)
                        .expect('Content-Type', /html/)
                        .expect(200)
                });
            });

            it('should respond with 404 Not Found when given a non-existent ID', function() {
                return request(app)
                    .get('/trial/i_dont_exist')
                    .expect('Content-Type', /html/)
                    .expect(404)
            });
        });
    });
});
