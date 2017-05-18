const path = require('path');
const webpack = require('webpack');

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
        })
    ]
};
