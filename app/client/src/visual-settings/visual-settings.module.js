let angular = require('angular');
let component = require('./visual-settings.component.js');
let importCss = require('../core/util.js').css;

// Requiring this module returns its name
let rzSlider = require('angularjs-slider');
// Also include the necessary CSS
require('angularjs-slider/dist/rzslider.min.css!');

module.exports = angular.module('visualSettings', [rzSlider])
    .component('visualSettings', component);

importCss(module.exports);
