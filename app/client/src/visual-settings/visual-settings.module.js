const angular = require('angular');
const component = require('./visual-settings.component.js');
const importCss = require('../core/util.js').css;

// Requiring this module returns its name
const rzSlider = require('angularjs-slider');
// Also include the necessary CSS
require('angularjs-slider/dist/rzslider.min.css!');

module.exports = angular.module('visualSettings', [rzSlider])
    .component('visualSettings', component);

importCss(module.exports);
