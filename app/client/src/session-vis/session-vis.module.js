let angular = require('angular');
let core = require('../core/core.module.js');
let timeline = require('../timeline/timeline.module.js');
let volume = require('../volume/volume.module.js');
let sessionVisComponent = require('./session-vis.component.js');

let importCss = require('../core/util.js').css;

module.exports = angular.module('sessionVis', [core.name, timeline.name, volume.name])
    .component('sessionVis', sessionVisComponent);


importCss(module.exports);
