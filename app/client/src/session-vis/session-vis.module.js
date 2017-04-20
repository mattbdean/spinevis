let angular = require('angular');
let core = require('../core/core.module.js');
let timeline = require('../timeline/timeline.module.js');
let volume = require('../volume/volume.module.js');
let visualSettings = require('../visual-settings/visual-settings.module.js');
let maskToggles = require('../mask-toggles/mask-toggles.module.js');
let sessionVisComponent = require('./session-vis.component.js');
let help = require('../help/help.module.js');

let importCss = require('../core/util.js').css;

module.exports = angular.module('sessionVis',
    [core.name, timeline.name, volume.name, visualSettings.name, maskToggles.name, help.name])
    .component('sessionVis', sessionVisComponent);


importCss(module.exports);
