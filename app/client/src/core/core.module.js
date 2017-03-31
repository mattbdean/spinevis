let angular = require('angular');
let title = require('./title.factory.js');

module.exports = angular.module('core', [])
    .factory(title.name, title.def);
