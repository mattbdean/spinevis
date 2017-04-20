let angular = require('angular');
let core = require('../core/core.module.js');
let intensityManager = require('./intensity-manager.service.js');
let volumeComponent = require('./volume.component.js');

module.exports = angular.module('volume', [core.name])
    .component('volume', volumeComponent)
    .service(intensityManager.name, intensityManager.def);
