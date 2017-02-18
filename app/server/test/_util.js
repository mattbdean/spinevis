let server = require('../src/server.js');
let database = require('../src/database.js');

module.exports = {
    TESTING_PORT: 8081,
    serverFactory: server,
    closeConnections: function(app, done) {
        database.close().then(function() {
            app.close(done);
        })
    }
}
