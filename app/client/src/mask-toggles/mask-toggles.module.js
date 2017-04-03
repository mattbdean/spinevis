let angular = require('angular');
let core = require('../core/core.module.js');
let component = require('./mask-toggles.component.js');

// Simply require it to wire our dependencies, no actual return value
require('angular-bootstrap-toggle');
require('angular-bootstrap-toggle/dist/angular-bootstrap-toggle.min.css!');
let importCss = require('../core/util.js').css;

module.exports = angular.module('maskToggles', [core.name, 'ui.toggle'])
    .component('maskToggles', component);

importCss(module.exports);
