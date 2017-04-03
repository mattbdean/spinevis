let angular = require('angular');
let title = require('./title.factory.js');
let session = require('./session.service.js');

module.exports = angular.module('core', [])
    .factory(title.name, title.def)
    .service(session.name, session.def);
