const fs = require('fs');
const path = require('path');

module.exports = function(grunt) {
    const pkg = grunt.file.readJSON('package.json');

    const finalDist = 'app/server/public/';

    grunt.initConfig({
        pkg: pkg,
        clean: {
            buildPrep: [finalDist],
            testPrep: ['build']
        },
        eslint: {
            all: [
                'Gruntfile.js',
                'karma.conf.js',
                'app/client/src/**/*.js',
                'app/server/src/**/*.js'
            ]
        },
        karma: {
            unit: {
                configFile: 'app/client/config/karma.conf.js',
                singleRun: true,
                browsers: ['Firefox']
            }
        },
        mocha_istanbul: {
            options: {
                coverageFolder: 'build/reports/coverage/server'
            },
            default: ['app/server/test'],
            noDbMode: ['app/server/test/validation.js']
        },
        lcovMerge: {
            options: {
                outputFile: 'build/reports/coverage/lcov.merged.info'
            },
            src: 'build/reports/coverage/**/lcov.info'
        },
        coveralls: {
            default: {
                src: 'build/reports/coverage/lcov.merged.info'
            }
        },
        cssmin: {
            options: {
                sourceMap: true
            },
            build: {
                files: [{
                    expand: true,
                    cwd: 'app/client/assets',
                    src: ['*.css'],
                    dest: finalDist + 'style',
                    ext: '.min.css'
                }]
            }
        },
        pug: {
            compile: {
                files: {
                    // Created dynamically
                }
            }
        },
        watch: {
            js: {
                files: ['app/client/src/**/*.js'],
                tasks: ['babel:dist']
            },
            css: {
                files: ['./app/client/assets/style/*.css'],
                tasks: ['cssmin']
            },
            views: {
                files: ['app/server/src/views/**/*.pug'],
                tasks: ['pug']
            },
            jspmConfig: {
                files: ['app/client/jspm.config.js'],
                tasks: ['babel:jspmConfig']
            }
        },
        run: {
            bench: {
                cmd: 'node',
                args: ['app/server/benchmarks/queries.js']
            }
        }
    });

    const walkTree = function(dir) {
        if (dir.endsWith('/'))
            dir = dir.substring(0, dir.length - 1);

        let results = [];
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
            file = dir + '/' + file;
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory())
                results = results.concat(walkTree(file));
            else
                results.push(file);
        });

        return results;
    };

    // Dynamically add a key-value-pair to pug.compile.files for every file in
    // app/server/src/views

    const srcDir = 'app/server/src/views/';
    const outDir = finalDist + 'views/';
    const filesMap = {};

    // Data to be passed to every template
    const data = {
        year: '2016 - ' + new Date().getFullYear()
    };

    const excludedTemplates = ['error.pug', 'layout.pug'];

    // All views that can't be rendered statically or shouldn't be rendered
    // directly
    walkTree(srcDir).forEach((view) => {
        // Get the file name relative to srcDir
        const relativeName = view.slice(srcDir.length);

        // Ignore dynamic views
        if (excludedTemplates.includes(relativeName)) {
            return;
        }

        const relativeBasename = relativeName.substring(0, relativeName.lastIndexOf('.'));
        const compiledPath = outDir + relativeBasename + '.html';
        filesMap[compiledPath] = view;
    });
    grunt.config('pug.compile.files', filesMap);
    grunt.config('pug.compile.options.data', data);

    const tasks = [
        'contrib-clean',
        'contrib-cssmin',
        'contrib-pug',
        'contrib-watch',
        'coveralls',
        'eslint',
        'jspm-depcache',
        'karma',
        'lcov-merge',
        'mocha-istanbul',
        'run'
    ];

    for (let i = 0; i < tasks.length; i++) {
        grunt.loadNpmTasks(`grunt-${tasks[i]}`);
    }

    grunt.registerTask('default', ['test']);
    grunt.registerTask('test', ['mocha_istanbul:default', 'karma']);
    grunt.registerTask('noDbModeWarn', function() {
        grunt.log.writeln('WARNING: Some tests have been skipped due to no access to a database');
    });
    grunt.registerTask('testCoverage', ['clean:testPrep', 'mocha_istanbul:noDbMode', 'noDbModeWarn', 'karma']);
    grunt.registerTask('uploadCoverage', ['lcovMerge', 'coveralls']);

    grunt.registerTask('build', ['clean:buildPrep', 'pug', 'cssmin']);
};
