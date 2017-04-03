let angular = require('angular');
let core = require('../core/core.module.js');
let volumeComponent = require('./volume.component.js');

module.exports = angular.module('volume', [core.name])
    .component('volume', volumeComponent);
