const angular = require('angular');
const component = require('./help.component.js');

const ngMaterial = require('angular-material');

module.exports = angular.module('help', [ngMaterial])
    .component('help', component);
