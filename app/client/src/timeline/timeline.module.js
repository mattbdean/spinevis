let angular = require('angular');
let core = require('../core/core.module.js');
let timelineComponent = require('./timeline.component.js');

module.exports = angular.module('timeline', [core.name])
    .component('timeline', timelineComponent);
