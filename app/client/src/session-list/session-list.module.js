let angular = require('angular');
let core = require('../core/core.module.js');
let sessionListComponent = require('./session-list.component.js');
let importCss = require('../core/util.js').css;

require('angularjs-datepicker');
require('angularjs-datepicker/dist/angular-datepicker.min.css!');

module.exports = angular.module('sessionList', [core.name, '720kb.datepicker'])
    .component('sessionList', sessionListComponent);

importCss(module.exports);
