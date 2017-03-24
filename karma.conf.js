// Karma configuration
// Generated on Fri Dec 30 2016 18:38:18 GMT-0500 (EST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: 'app/client',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jspm', 'mocha'],


    // list of non-CommonJS files / patterns to load in the browser
    // NB: Specify source files for JSPM in jspm.loadFiles
    files: [],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
        'src/**/*.js': ['coverage']
    },


    jspm: {
        config: 'config.js',
        loadFiles: [
            'jspm_packages/npm/angular@1.6.2.js',
            'src/**/*.js',
            'test/**/*.js'
        ],
        serveFiles: ['jspm_packages/**/*']
    },

    proxies: {
        '/scripts/jspm_packages/': '/base/jspm_packages/',
        '/scripts/src/': '/base/src/',
        '/scripts/test/': '/base/test/'
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage', 'mocha'],


    coverageReporter: {
        dir: '../../build/reports/coverage/client',
        reporters: [
            { type: 'html', subdir: 'lcov-report' },
            { type: 'lcovonly', subdir: '.', file: 'lcov.info' }
        ]
    },


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'Firefox'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,
  })
}
