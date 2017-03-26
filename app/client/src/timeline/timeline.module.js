let angular = require('angular');
let timelineComponent = require('./timeline.component.js');

module.exports = angular.module('timeline', [])
    .component('timeline', timelineComponent);
