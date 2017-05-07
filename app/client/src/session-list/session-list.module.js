const angular = require('angular');
const core = require('../core/core.module.js');
const sessionListComponent = require('./session-list.component.js');
const ngInfiniteScroll = require('ng-infinite-scroll');
const importCss = require('../core/util.js').css;

require('angularjs-datepicker');
require('angularjs-datepicker/dist/angular-datepicker.min.css!');

module.exports = angular.module('sessionList', [core.name, '720kb.datepicker', ngInfiniteScroll])
    .component('sessionList', sessionListComponent);

importCss(module.exports);
