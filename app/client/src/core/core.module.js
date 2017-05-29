const angular = require('angular');
const title = require('./title.factory.js');
const session = require('./session.service.js');
const animal = require('./animal.service');

module.exports = angular.module('core', [])
    .factory(title.name, title.def)
    .service(session.name, session.def)
    .service(animal.name, animal.def);
