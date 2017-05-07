require('babel-polyfill');

const angular = require('angular');

const sessionVis = require('./session-vis/session-vis.module.js');
const sessionList = require('./session-list/session-list.module.js');

angular.module('spinevis', [
    sessionVis.name,
    sessionList.name
]);
