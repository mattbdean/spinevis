const request = require('supertest');
const queries = require('../src/queries.js');
const util = require('./_util.js');

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

    describe('GET /', function() {
        it('should respond with 200 OK', function() {
            return expectHtml(app, '/');
        });
    });

    describe('GET /session/:id', function() {
        it('should respond with 200 when given an existing ID', function() {
            return queries.findAllSessions(0, 1)
            .then(function(sessions) {
                const id = sessions[0]._id;
                return expectHtml(app, '/session/' + id);
            });
        });

        it('should respond with 400 Bad Request when given a malformed ID', function() {
            return expectHtml(app, '/session/malformed_id', 400);
        });

        it('should 404 when given a valid, but non-existent ID', () => {
            return expectHtml(app, '/session/AAAA11:11111111:1:1:myname', 404);
        });
    });

    const expectHtml = function(app, path, statusCode = 200) {
        return request(app)
            .get(path)
            .expect('Content-Type', /html/)
            .expect(statusCode);
    };
});
