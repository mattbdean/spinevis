const angular = require('angular');
const component = require('./visual-settings.component.js');

// Requiring this module returns its name
const rzSlider = require('angularjs-slider');
require('angularjs-slider/dist/rzslider.css');

// Require angular-fancy-modal and its stylesheet
require('angular-fancy-modal/dist/angular-fancy-modal');
require('angular-fancy-modal/dist/angular-fancy-modal.css');

module.exports = angular.module('visualSettings', [rzSlider, 'vesparny.fancyModal'])
    .component('visualSettings', component);

// Import the component's stylesheet
require('./visual-settings.css');
