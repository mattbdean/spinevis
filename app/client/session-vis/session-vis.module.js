let angular = require('angular');
let core = require('../core/core.module.js');
let sessionVisComponent = require('./session-vis.component.js');

module.exports = angular.module('sessionVis', [core.name])
    .component('sessionVis', sessionVisComponent);
