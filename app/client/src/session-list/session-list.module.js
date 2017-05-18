const angular = require('angular');
const core = require('../core/core.module.js');
const sessionListComponent = require('./session-list.component.js');
const ngInfiniteScroll = require('ng-infinite-scroll');

require('angularjs-datepicker');
require('angularjs-datepicker/dist/angular-datepicker.css');

module.exports = angular.module('sessionList', [core.name, '720kb.datepicker', ngInfiniteScroll])
    .component('sessionList', sessionListComponent);

require('./session-list.css');
