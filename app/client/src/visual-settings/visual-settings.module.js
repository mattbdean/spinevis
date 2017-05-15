const angular = require('angular');
const component = require('./visual-settings.component.js');

// Requiring this module returns its name
const rzSlider = require('angularjs-slider');
require('angularjs-slider/dist/rzslider.css');

module.exports = angular.module('visualSettings', [rzSlider])
    .component('visualSettings', component);

// Import the component's stylesheet
require('./visual-settings.css');
