let angular = require('angular');
let trialVis = require('./trial-vis/trial-vis.module.js');
let sessionList = require('./session-list/session-list.module.js');

const appName = 'spinevis';

angular.module(appName, [
    trialVis.name,
    sessionList.name
]);
