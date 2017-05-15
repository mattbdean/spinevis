const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const validation = require('./validation.js');
const queries = require('../queries.js');

const year = new Date().getFullYear();

router.get('/', function(req, res, next) {
    sendView(res, 'index').catch(function(err) {
        next(err);
    });
});

router.get('/session/:id', function(req, res, next) {
    const id = req.params.id;
    if (!validation.sessionId(id)) {
        return next({status: 400});
    }
    return queries.sessionExists(id).then((exists) => {
        if (!exists)
            return next({status: 404});
        return res.render('session', {appName: 'spinevis', year: '2016 - ' + year, id: id});
    });
});

// Serve partial templates for Angular. /partial/my-template retrieves the
// template at partials/my-template.template.pug
router.get('/partial/:name', function(req, res, next) {
    if (validation.partialName(req.params.name)) {
        const templateBasename = req.params.name;

        const relativePath = `partials/${templateBasename}.template`;
        const prerenderedFile = path.join(fileServeOptions.root, relativePath + '.html');
        // Prefer to use pre-rendered templates
        if (fs.existsSync(prerenderedFile)) {
            sendView(res, relativePath).catch(function(err) {
                next(err);
            });
        } else {
            // Fall back on dynamic rendering if no pre-rendered file is available
            res.render(relativePath + '.pug');
        }
    } else {
        sendError(next, 'Template Not Found');
    }
});

const sendError = function(next, message, status = 404) {
    return next({status: status, message: message});
};

const fileServeOptions = {
    dotfiles: 'deny',
    root: path.resolve(path.join(__dirname, '../../public/views'))
};

const sendView = function(res, fileName) {
    return new Promise(function(fulfill, reject) {
        res.sendFile(fileName + '.html', fileServeOptions, function(err) {
            if (err) return reject(err);
            else return fulfill(fileName);
        });
    });
};

module.exports = router;
