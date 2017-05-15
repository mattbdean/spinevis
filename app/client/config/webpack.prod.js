const webpack = require('webpack');
const merge = require('webpack-merge');

module.exports = merge(require('./webpack.common'), {
    plugins: [
        new webpack.optimize.UglifyJsPlugin()
    ]
});
