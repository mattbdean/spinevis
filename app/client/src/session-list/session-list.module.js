let angular = require('angular');
let sessionListComponent = require('./session-list.component.js');

module.exports = angular.module('sessionList', [])
    .component('sessionList', sessionListComponent);
