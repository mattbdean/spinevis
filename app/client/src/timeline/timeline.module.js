let angular = require('angular');
let core = require('../core/core.module.js');
let downsampler = require('./downsampler.service.js');
let traceManager = require('./trace-manager.service.js');
let timelineComponent = require('./timeline.component.js');

module.exports = angular.module('timeline', [core.name])
    .component('timeline', timelineComponent)
    .service(downsampler.name, downsampler.def)
    .service(traceManager.name, traceManager.def);
