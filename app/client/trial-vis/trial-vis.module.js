let core = require('../core/core.module.js');
let trialVisComponent = require('./trial-vis.component.js');

module.exports = angular.module('trialVis', [core.name])
    .component('trialVis', trialVisComponent);
