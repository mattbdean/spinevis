#!/usr/bin/env node
'use strict';

let fs = require('fs');
let os = require('os');

let spdy = require('spdy');
let _ = require('lodash');

let listEndpoints = require('express-list-endpoints');
let createApp = require('./app/server/src/server.js');

// Catch unhandled Promises
process.on('unhandledRejection', function(reason, p) {
    console.error("Unhandled Promise rejection: ");
    throw reason;
});

// Gather some information from command line arguments and environmental variables
const options = {
    port: process.env.PORT || 8080,
    noHttp2: process.argv.includes('--no-http2')
};

bootstrap(options);

async function bootstrap(options) {
    let spdyOptions = null;

    if (!options.noHttp2) {
        try {
            spdyOptions = await spdyConf();
            console.log('HTTP/2 enabled');
        } catch (ex) {
            console.error('WARNING: Starting in non-HTTP/2 mode:', ex.message);
        }
    } else {
        console.log('HTTP/2 disabled by user (via --no-http2)');
    }

    let app = await createApp();
    logEndpoints(app);

    await startServer(app, spdyOptions, options.port);
    let protocol = spdyOptions === null ? 'http' : 'https';
    let url = `${protocol}://${os.hostname()}:${options.port}`;

    console.log('\nMagic is happening at ' + url);
};

function startServer(app, spdyOptions, port) {
    // Use a spdy server if spdyOptions is not null, otherwise use the Express app
    let server = spdyOptions ? spdy.createServer(spdyOptions, app) : app;
    return server.listen(port);
};

/**
 * Creates a configuration object that can be accepted by a spdy server.
 * Contains a 'key' and 'cert' properties. Expects 'server.key' and 'server.crt'
 * to both be in the same directory as this script and readable by the user
 * executing this script.
 */
async function spdyConf() {
    let requiredFiles = ['server.key', 'server.crt'];
    // Map requiredFiles to absolute path
    requiredFiles = _.map(requiredFiles, f => __dirname + '/' + f);

    // Ensure all files specified here exist and are readable by us
    try {
        await Promise.all(_.map(requiredFiles, f => ensureReadable(f)))
    } catch (ex) {
        throw new Error('server.key and/or server.crt do not exist or are not readable');
    }

    // files[i] is a Buffer of requiredFiles[i]
    let files;
    try {
        files = await Promise.all(_.map(requiredFiles, f => readFile(f)));
    } catch (ex) {
        if (ex.code === 'EISDIR') {
            throw new Error('server.key and/or server.crt are directories');
        } else {
            throw ex;
        }
    }

    return {
        key: files[0],
        cert: files[1]
    };
};

/**
 * Logs a list of available endpoints to stdout
 *
 * @param  {object} app Express app
 */
function logEndpoints(app) {
    console.log('Available endpoints:\n');
    let endpoints = _.sortBy(listEndpoints(app), (e) => e.path);
    for (let e of endpoints) {
        console.log(`  ${_.join(e.methods, ', ')} ${e.path}`);
    }
}

/**
 * Ensures that a file or directory at a given path is readable. Returns a
 * Promise.
 */
function ensureReadable(path) {
    return new Promise(function(resolve, reject) {
        fs.access(path, fs.constants.R_OK, (err) => {
            if (err) reject(err);
            else resolve(path);
        });
    });
};

/**
 * Reads the contents of a file. Returns a Promise.
 */
function readFile(file) {
    return new Promise(function(resolve, reject) {
        fs.readFile(file, (err, data) => {
            if (err) reject(err);
            else resolve(data)
        });
    });
}
