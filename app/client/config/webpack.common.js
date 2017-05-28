const path = require('path');
const webpack = require('webpack');

const appVersion = require('../../../package.json').version;

module.exports = {
    context: path.join(__dirname, '..'),
    entry: {
        app: './src/app.module.js',
        vendor: './src/vendor.js',
        polyfills: './src/polyfills.js'
    },
    output: {
        filename: 'app/server/public/scripts/[name].js'
    },
    resolve: {
        extensions: ['.js']
    },
    module: {
        rules: [
            {
                test: /\.pug$/,
                loader: ['raw-loader', 'pug-html-loader']
            },
            {
                test: /\.css$/,
                loader: ['style-loader', 'css-loader']
            },
            {
                test: /\.scss$/,
                loader: ['style-loader', 'css-loader', 'sass-loader']
            },
            // Necessary for building Plotly.js, see
            // https://github.com/plotly/plotly.js#webpack-usage-with-modules
            {
                test: /node_modules/,
                loader: 'ify-loader'
            }
        ]
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            names: ['app', 'vendor', 'polyfills'],
        }),
        new webpack.DefinePlugin({
            // From the DefinePlugin docs:
            // Note that because the plugin does a direct text replacement, the
            // value given to it must include actual quotes inside of the string
            // itself. Typically, this is done either with either alternate
            // quotes, such as '"production"', or by using
            // JSON.stringify('production').
            VERSION: JSON.stringify(appVersion)
        })
    ]
};
