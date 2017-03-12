let angular = require('angular');
let sessionVis = require('./session-vis/session-vis.module.js');
let sessionList = require('./session-list/session-list.module.js');

const appName = 'spinevis';

angular.module(appName, [
    sessionVis.name,
    sessionList.name
]);
