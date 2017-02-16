#!/usr/bin/env node
'use strict';

// Catch unhandled Promises
process.on('unhandledRejection', function(reason, p) {
    console.error("Unhandled Promise rejection: ");
    throw reason;
});

// Define a port to host the server on
const port = process.env.PORT || 8080;

require('./app/server/src/server.js')().then(function(app) {
    app.listen(port);
    console.log('Magic is happening on port ' + port);
}).catch(function(err) {
    throw err;
});
