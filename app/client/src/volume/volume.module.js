let angular = require('angular');
let volumeComponent = require('./volume.component.js');

module.exports = angular.module('volume', [])
    .component('volume', volumeComponent);
