let angular = require('angular');
let trialVis = require('./trial-vis/trial-vis.module.js');

const appName = 'spinevis';

angular.module(appName, [
    trialVis.name
]);
