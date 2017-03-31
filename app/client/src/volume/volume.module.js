let angular = require('angular');
let volumeComponent = require('./volume.component.js');
let importCss = require('../core/util.js').css;

// Requiring this module returns its name
let rzSlider = require('angularjs-slider');
// Also include the necessary CSS
require('angularjs-slider/dist/rzslider.min.css!')

module.exports = angular.module('volume', [rzSlider])
    .component('volume', volumeComponent);

importCss(module.exports);
