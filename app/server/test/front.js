let _ = require('lodash');
let fs = require('fs');
let path = require('path');
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

    describe('sessions', function() {
        describe('GET /', function() {
            it('should respond with 200 OK', function() {
                return expectHtml(app, '/');
            });
        });

        describe('GET /session/:id', function() {
            it('should respond with 200 when given an existing ID', function() {
                return queries.findAllSessions(0, 1)
                .then(function(sessions) {
                    let id = sessions[0]._id;
                    return expectHtml(app, '/session/' + id);
                });
            });

            it('should respond with 400 Bad Request when given a malformed ID', function() {
                return expectHtml(app, '/session/malformed_id', 400);
            });

            it('should 404 when given a valid, but non-existent ID', () => {
                return expectHtml(app, '/session/AAAA11:11111111:1:1', 404);
            });
        });
    });

    describe('GET /partial/:name', function() {
        // Dynamically create tests for partials, make sure every partial in the
        // list responds withi 200 OK
        const partials = _.map(fs.readdirSync(__dirname + '/../src/views/partials'), p => path.basename(p, '.template.pug'));
        for (const name of partials) {
            it(`should respond with HTML for "/partial/${name}"`, () =>
                expectHtml(app, '/partial/' + name));
        }
    });

    let expectHtml = function(app, path, statusCode = 200) {
        return request(app)
            .get(path)
            .expect('Content-Type', /html/)
            .expect(statusCode);
    };
});
