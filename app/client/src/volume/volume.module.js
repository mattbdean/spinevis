let angular = require('angular');
let volumeComponent = require('./volume.component.js');

// Requiring this module returns its name
let rzSlider = require('angularjs-slider');

module.exports = angular.module('volume', [rzSlider])
    .component('volume', volumeComponent);
