const angular = require('angular');
const core = require('../core/core.module.js');
const timeline = require('../timeline/timeline.module.js');
const volume = require('../volume/volume.module.js');
const visualSettings = require('../visual-settings/visual-settings.module.js');
const maskToggles = require('../mask-toggles/mask-toggles.module.js');
const sessionVisComponent = require('./session-vis.component.js');
const help = require('../help/help.module.js');

const importCss = require('../core/util.js').css;

module.exports = angular.module('sessionVis',
    [core.name, timeline.name, volume.name, visualSettings.name, maskToggles.name, help.name])
    .component('sessionVis', sessionVisComponent);


importCss(module.exports);
