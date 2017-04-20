const angular = require('angular');
const component = require('./help.component.js');

require('angular-fancy-modal');
require('angular-fancy-modal/dist/angular-fancy-modal.css!');

module.exports = angular.module('help', ['vesparny.fancyModal'])
    .component('help', component);
