#!/usr/bin/env node
'use strict';

// Catch unhandled Promises
process.on('unhandledRejection', function(reason, p) {
    console.error("Unhandled Promise rejection: ");
    throw reason;
});

// Define a port to host the server on
const port = process.env.PORT || 8080;

let appName = require('./package.json').name;

require('./app/server/src/server.js')(port, appName);
