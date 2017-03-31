let angular = require('angular');
let sessionListComponent = require('./session-list.component.js');
let importCss = require('../core/util.js').css;

module.exports = angular.module('sessionList', [])
    .component('sessionList', sessionListComponent);

importCss(module.exports);
