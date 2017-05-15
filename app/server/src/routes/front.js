const router = require('express').Router();
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
