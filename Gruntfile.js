let fs = require('fs');
let path = require('path');

module.exports = function(grunt) {
    let pkg = grunt.file.readJSON('package.json');

    const clientBase = 'app/client/';
    const finalDist = 'app/server/public/';

    grunt.initConfig({
        pkg: pkg,
        clean: {
            buildPrep: [finalDist],
            testPrep: ['build'],
            jspm: [clientBase + 'jspm_packages']
        },
        jshint: {
            all: [
                'Gruntfile.js',
                'karma.conf.js',
                'app/client/!(build|jspm_packages)/**/*.js',
                'app/server/src/**/*.js'
            ],
            options: {
                jshintrc: true
            }
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js',
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
                    // Created dynamically
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
        babel: {
            options: {
                sourceMap: true,
                presets: ['es2015']
            },
            dist: {
                files: [{
                    cwd: clientBase + 'src/',
                    expand: true,
                    src: ['**/*.js'],
                    dest: finalDist + 'scripts'
                }]
            },
            jspmConfig: {
                files: [{
                    cwd: clientBase,
                    expand: true,
                    src: ['jspm.config.js'],
                    dest: finalDist + 'scripts'
                }]
            }
        },
        depcache: {
            dist: ['src/app.module.js']
        },
        copy: {
            jspm: {
                cwd: clientBase + 'jspm_packages/',
                src: '**',
                dest: finalDist + 'scripts/jspm_packages/',
                expand: true
            }
        },
        watch: {
            js: {
                files: ['app/client/src/**/*.js'],
                tasks: ['babel:dist']
            },
            css: {
                files: ['./app/client/_assets/style/*.css'],
                tasks: ['cssmin', 'copy:style']
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

    // Created a .min.css file for every CSS file in the style directory
    let cssFiles = grunt.file.expand('app/client/_assets/style/*.css');
    let minifyTargets = [];

    // Create cssmin.build.files dynamically
    for (let cssFile of cssFiles) {
        minifyTargets.push({
            src: cssFile,
            dest: finalDist + `style/${path.basename(cssFile, '.css')}.min.css`
        });
    }
    grunt.config('cssmin.build.files', minifyTargets);

    let walkTree = function(dir) {
        if (dir.endsWith('/'))
            dir = dir.substring(0, dir.length - 1);

        let results = [];
        let files = fs.readdirSync(dir);
        files.forEach(file => {
            file = dir + '/' + file;
            let stat = fs.statSync(file);
            if (stat && stat.isDirectory())
                results = results.concat(walkTree(file));
            else
                results.push(file);
        });

        return results;
    };

    // Dynamically add a key-value-pair to pug.compile.files for every file in
    // app/server/src/views

    let srcDir = 'app/server/src/views/';
    let outDir = finalDist + 'views/';
    let filesMap = {};

    // Data to be passed to every template
    let data = {
        year: "2016 - " + new Date().getFullYear()
    };

    let excludedTemplates = ["error.pug", "layout.pug", "session.pug"];

    // All views that can't be rendered statically or shouldn't be rendered
    // directly
    walkTree(srcDir).forEach(view => {
        // Get the file name relative to srcDir
        let relativeName = view.slice(srcDir.length);

        // Ignore dynamic views
        if (excludedTemplates.includes(relativeName)) {
            return;
        }

        let relativeBasename = relativeName.substring(0, relativeName.lastIndexOf('.'));
        let compiledPath = outDir + relativeBasename + '.html';
        filesMap[compiledPath] = view;
    });
    grunt.config('pug.compile.files', filesMap);
    grunt.config('pug.compile.options.data', data);

    let tasks = [
        'babel',
        'contrib-clean',
        'contrib-copy',
        'contrib-cssmin',
        'contrib-jshint',
        'contrib-pug',
        'contrib-watch',
        'coveralls',
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

    grunt.registerTask('build', ['clean:buildPrep', 'cssmin', 'pug', 'depcache', 'babel', 'copy']);
};
