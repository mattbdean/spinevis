const angular = require('angular');
const component = require('./visual-settings.component.js');

// Requiring this module returns its name
const rzSlider = require('angularjs-slider');
require('angularjs-slider/dist/rzslider.css');

const ngMaterial = require('angular-material');

module.exports = angular.module('visualSettings', [rzSlider, ngMaterial])
    .component('visualSettings', component);

// Import the component's stylesheet
require('./visual-settings.scss');
