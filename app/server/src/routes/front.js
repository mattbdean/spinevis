let router = require('express').Router();
let fs = require('fs');
let path = require('path');
let validation = require('./validation.js');
let queries = require('../queries.js');

let appName = require('../../../../package.json').name;
let year = new Date().getFullYear();

router.get('/', function(req, res, next) {
    sendView(res, 'index').catch(function(err) {
        next(err);
    });
});

router.get('/trial/:id', function(req, res, next) {
    let id = req.params.id;
    if (!validation.trialId(id)) {
        return next({status: 404});
    }
    return queries.trialExists(id).then((exists) => {
        if (!exists)
            return next({status: 404});
        return res.render('trial', {appName: appName, year: year, id: req.params.id});
    });
});

// Serve partial templates for Angular. /partial/my-template retrieves the
// template at partials/my-template.template.pug
router.get('/partial/:name', function(req, res, next) {
    if (validation.partialName(req.params.name)) {
        let relativePath = 'partials/' + req.params.name + '.template';
        let prerenderedFile = path.join(fileServeOptions.root, relativePath + '.html');
        // Prefer to use pre-rendered templates
        if (fs.existsSync(prerenderedFile)) {
            sendView(res, relativePath).catch(function(err) {
                next(err);
            });
        } else {
            // Fall back on dynamic rendering if no pre-rendered file is available
            res.render(`partials/${req.params.name}.template.pug`);
        }
    } else {
        sendError(next, 'Template Not Found');
    }
});

let sendError = function(next, message, status = 404) {
    return next({status: status, message: message});
};

let fileServeOptions = {
    dotfiles: 'deny',
    root: path.resolve(path.join(__dirname, '../../public/views'))
};

let sendView = function(res, fileName) {
    return new Promise(function(fulfill, reject) {
        res.sendFile(fileName + '.html', fileServeOptions, function(err) {
            if (err) return reject(err);
            else return fulfill(fileName);
        });
    });
};

module.exports = router;
