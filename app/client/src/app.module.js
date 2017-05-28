const angular = require('angular');

const sessionVis = require('./session-vis/session-vis.module.js');
const sessionList = require('./session-list/session-list.module.js');

// AngularJS Material lib + styles
const ngMaterial = require('angular-material');
require('angular-material/angular-material.css');

const theme = require('./theme.config');

angular.module('spinevis', [
    sessionVis.name,
    sessionList.name,
    ngMaterial
]).config(theme);


// Insert the current version defined by the Webpack DefinePlugin
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('version').innerHTML = 'Version ' + VERSION;
});
