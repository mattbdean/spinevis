// We should be using a partial Plotly build but for whatever reason when using
// one, Chrome throws a ton of WebGL warnings and we can't set axis titles. For
// now, we're just going to require the whole thing.
//
// https://github.com/plotly/plotly.js/#modules
module.exports = require('plotly.js/dist/plotly');
