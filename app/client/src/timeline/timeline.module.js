const angular = require('angular');

const core = require('../core/core.module.js');
const downsampler = require('./downsampler.service.js');
const traceManager = require('./trace-manager.service.js');
const timelineComponent = require('./timeline.component.js');

module.exports = angular.module('timeline', [core.name])
    .component('timeline', timelineComponent)
    .service(downsampler.name, downsampler.def)
    .service(traceManager.name, traceManager.def);
