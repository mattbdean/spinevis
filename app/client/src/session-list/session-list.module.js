let angular = require('angular');
let core = require('../core/core.module.js');
let sessionListComponent = require('./session-list.component.js');
let importCss = require('../core/util.js').css;

module.exports = angular.module('sessionList', [core.name])
    .component('sessionList', sessionListComponent);

importCss(module.exports);
