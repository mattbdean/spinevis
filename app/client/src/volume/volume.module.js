const angular = require('angular');

const core = require('../core/core.module.js');
const intensityManager = require('./intensity-manager.service.js');
const volumeComponent = require('./volume.component.js');

module.exports = angular.module('volume', [core.name])
    .component('volume', volumeComponent)
    .service(intensityManager.name, intensityManager.def);
