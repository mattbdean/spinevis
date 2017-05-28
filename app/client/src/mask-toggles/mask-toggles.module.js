const angular = require('angular');
const core = require('../core/core.module.js');
const component = require('./mask-toggles.component.js');

const ngMaterial = require('angular-material');

module.exports = angular.module('maskToggles', [core.name, ngMaterial])
    .component('maskToggles', component);

require('./mask-toggles.scss');
