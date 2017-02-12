var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

var partialNameRegex = /^[a-z0-9-]+$/;

router.get('/', function(req, res, next) {
    sendView(res, 'index').catch(function(err) {
        next(err);
    });
});

// Serve partial templates for Angular. /partial/my-template retrieves the
// template at partials/my-template.template.pug
router.get('/partial/:name', function(req, res, next) {
    if (partialNameRegex.test(req.params.name)) {
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
