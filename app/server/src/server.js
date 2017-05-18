const bodyParser = require('body-parser');
const express = require('express');
const helmet = require('helmet');
const logger = require('morgan');
const mongodb = require('mongodb');
const path = require('path');
const db = require('./database.js');

const app = express();

module.exports = function(logToStdout = true, errorLogger = console.error) {
    ///////////////////// CONFIGURATION /////////////////////
    app.set('views', path.join(__dirname, './views'));
    app.set('view engine', 'pug');
    app.use(helmet());
    if (logToStdout) app.use(logger('dev'));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, '../public')));

    //////////////////////// ROUTING ////////////////////////
    const api = require('./routes/api')(errorLogger);
    app.use('/api/v1', api);
    app.use('/', require('./routes/front.js'));

    ///////////////////// ERROR HANDLING ////////////////////
    // Catch 404 and forward to error handler
    app.use(function(req, res, next) {
        const err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    // Development error handler
    if (app.get('env') === 'development') {
        app.use(function(err, req, res) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }

    // Production error handler, don't show stack traces
    app.use(function(err, req, res) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });


    ///////////////////////// START /////////////////////////
    // Connect to MongoDB and return app object which can be
    // listen()'d to
    return db.connect(db.MODE_PRODUCTION)
    .catch(function(err) {
        if (err instanceof mongodb.MongoError)
            throw new Error('Failed to connect to MongoDB. Is it running? (' + err.message + ')');
    })
    .then(function() {
        return app;
    });
};
