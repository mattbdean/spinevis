const angular = require('angular');
const core = require('../core/core.module.js');
const component = require('./mask-toggles.component.js');

// Simply require it to wire our dependencies, no actual return value
require('angular-bootstrap-toggle/dist/angular-bootstrap-toggle');
require('angular-bootstrap-toggle/dist/angular-bootstrap-toggle.css');

module.exports = angular.module('maskToggles', [core.name, 'ui.toggle'])
    .component('maskToggles', component);

require('./mask-toggles.css');
