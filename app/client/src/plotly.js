// Partial Plotly bundle so we don't have to require the entirety of Plotly.
// See https://github.com/plotly/plotly.js#modules
const Plotly = require('plotly.js/lib/core');

Plotly.register([
    require('plotly.js/lib/scatter'),
    require('plotly.js/lib/surface'),
    require('plotly.js/lib/mesh3d')
]);

module.exports = Plotly;
