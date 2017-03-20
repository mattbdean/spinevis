#!/usr/bin/env node
'use strict';

let listEndpoints = require('express-list-endpoints');
let _ = require('lodash');

// Catch unhandled Promises
process.on('unhandledRejection', function(reason, p) {
    console.error("Unhandled Promise rejection: ");
    throw reason;
});

// Define a port to host the server on
const port = process.env.PORT || 8080;

require('./app/server/src/server.js')().then(function(app) {
    console.log('Available endpoints:\n');
    let endpoints = _.sortBy(listEndpoints(app), (e) => e.path);
    for (let e of endpoints) {
        console.log(`  ${_.join(e.methods, ', ')} ${e.path}`);
    }

    app.listen(port);
    console.log('\nMagic is happening on port ' + port);
}).catch(function(err) {
    throw err;
});
