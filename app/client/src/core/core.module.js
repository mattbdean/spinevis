const angular = require('angular');
const title = require('./title.factory.js');
const session = require('./session.service.js');

module.exports = angular.module('core', [])
    .factory(title.name, title.def)
    .service(session.name, session.def);
