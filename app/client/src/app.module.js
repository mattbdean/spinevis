require('babel-polyfill');

let angular = require('angular');
let sessionVis = require('./session-vis/session-vis.module.js');
let sessionList = require('./session-list/session-list.module.js');

angular.module('spinevis', [
    sessionVis.name,
    sessionList.name
]);
