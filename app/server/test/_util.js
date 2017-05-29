const server = require('../src/server.js');
const database = require('../src/database.js');

module.exports = {
    TESTING_PORT: 8082,
    serverFactory: function() {
        // disable writing HTTP logs to stdout
        return server(false);
    },
    closeConnections: function(app, done) {
        database.close().then(function() {
            app.close(done);
        });
    }
};
