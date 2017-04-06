let fs = require('fs');
let path = require('path');
let bundle = require('jspm/lib/bundle');

module.exports = function(grunt) {
    let pkg = grunt.file.readJSON('package.json');

    let clientBase = 'app/client/';
    let build = clientBase + 'build/';
    let finalDist = 'app/server/public/';

    grunt.initConfig({
        pkg: pkg,
        clean: {
            buildPrep: [build, finalDist],
            testPrep: ['build'],
            jspm: [clientBase + 'jspm_packages']
        },
        mochaTest: {
            test: {
                src: ['app/server/test/**/*.js']
            }
        },
        jshint: {
            all: [
                'Gruntfile.js',
                'karma.conf.js',
                'app/client/!(build|jspm_packages)/**/*.js',
                'app/server/src/**/*.js'
            ],
            options: {
                // ECMAScript version 6
                esversion: 6,
                // Ignore "don't make functions in a loop"
                '-W083': true,
                // Use only 'let' or 'const', not 'var'
                varstmt: true
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
            default: {
                src: 'app/server/test',
                options: {
                    coverageFolder: 'build/reports/coverage/server'
                }
            },
            noDbMode: {
                src: [
                    'app/server/test/validation.js'
                ],
                options: {
                    coverageFolder: 'build/reports/coverage/server'
                }
            }
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
        depcache: {
            dist: ['src/app.module.js']
        },
        copy: {
            rawAssets: {
                cwd: 'app/client/_assets/raw',
                src: '**',
                dest: finalDist,
                expand: true
            },
            config: {
                cwd: clientBase,
                src: 'config.js',
                dest: finalDist + 'scripts/',
                expand: true
            },
            scripts: {
                cwd: clientBase + 'src/',
                src: ['**/*.js'],
                dest: finalDist + 'scripts',
                expand: true
            },
            jspm: {
                cwd: clientBase + 'jspm_packages/',
                src: '**',
                dest: finalDist + 'scripts/jspm_packages/',
                expand: true
            },
            style: {
                cwd: build + 'style',
                src: ['*.min.css', '*.min.css.map'],
                dest: finalDist + 'style',
                expand: true
            },
            views: {
                cwd: build + 'views',
                src: '**',
                dest: finalDist + 'views',
                expand: true
            },
            dist: {
                cwd: build,
                src: '**', // copy all files and subdirectories
                dest: finalDist,
                expand: true
            }
        },
        watch: {
            js: {
                files: ['app/client/src/**/*.js'],
                tasks: ['copy:scripts']
            },
            css: {
                files: ['./app/client/_assets/style/*.css'],
                tasks: ['cssmin', 'copy:style']
            },
            views: {
                files: ['app/server/src/views/**/*.pug'],
                tasks: ['pug', 'copy:views']
            },
            raw: {
                files: ['app/client/_assets/raw/**/*'],
                tasks: ['copy:rawAssets']
            },
            jspmConfig: {
                files: ['app/client/config.js'],
                tasks: ['clean:jspm', 'copy:config', 'copy:jspm']
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
            dest: build + `style/${path.basename(cssFile, '.css')}.min.css`
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
    let outDir = build + 'views/';
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
        'mocha-test',
        'mocha-istanbul',
        'run'
    ];

    for (let i = 0; i < tasks.length; i++) {
        grunt.loadNpmTasks(`grunt-${tasks[i]}`);
    }

    grunt.registerTask('default', ['test']);
    grunt.registerTask('test', ['mochaTest', 'karma']);
    grunt.registerTask('noDbModeWarn', function() {
        grunt.log.writeln('WARNING: Some tests have been skipped due to no access to a database');
    });
    grunt.registerTask('testCoverage', ['clean:testPrep', 'mocha_istanbul:noDbMode', 'noDbModeWarn', 'karma']);
    grunt.registerTask('uploadCoverage', ['lcovMerge', 'coveralls']);
    grunt.registerTask('build', ['clean:buildPrep', 'cssmin', 'pug', 'depcache', 'copy']);
};
