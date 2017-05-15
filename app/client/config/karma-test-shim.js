Error.stackTraceLimit = Infinity;

require('core-js/es6');

// Dynamically load all specs using webpack's require.context()
const appContext = require.context('../src', true, /\.spec\.js/);

appContext.keys().forEach(appContext);
