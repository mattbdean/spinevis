const angular = require('angular');
const core = require('../core/core.module.js');
const sessionListComponent = require('./session-list.component.js');
const ngInfiniteScroll = require('ng-infinite-scroll');

const ngMaterial = require('angular-material');

module.exports = angular.module('sessionList', [core.name, ngInfiniteScroll, ngMaterial])
    .component('sessionList', sessionListComponent);

require('./session-list.scss');
