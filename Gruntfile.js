let fs = require('fs');

module.exports = function(grunt) {
    let finalDist = 'app/server/public/';

    let build = 'app/client/build/';
    let buildStaging = build + 'staging/';
    let buildDist = build + 'dist/';

    let cssBuilds = ['index'];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            testPrep: ['.cache', 'build'],
            buildPrep: [build, finalDist]
        },
        mochaTest: {
            test: {
                src: ['app/server/test/**/*.js']
            }
        },
        jshint: {
            all: [
                'Gruntfile.js',
                'app/client/!(build)/**/*.js',
                'app/server/src/**/*.js'
            ],
            options: {
                // ECMAScript version 6
                esversion: 6
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
        browserify: {
            // Enable source maps at the end of the file
            // options: {
            //     browserifyOptions: {
            //         debug: true
            //     }
            // },
            app: {
                src: 'app/client/app.module.js',
                dest: buildStaging + 'app.browserify.js'
            }
        },
        babel: {
            options: {
                presets: ['es2015'],
                compact: true
            },
            app: {
                files: {
                    [buildStaging + 'app.babel.js']: buildStaging + 'app.browserify.js'
                }
            }
        },
        uglify: {
            options: {
                banner: '/*! Grunt Uglify <%= grunt.template.today("yyyy-mm-dd") %> */ ',
            },
            app: {
                files: {
                    [buildStaging + 'app.min.js']: [buildStaging + 'app.babel.js']
                }
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
        copy: {
            fonts: {
                cwd: 'node_modules/bootstrap/dist/fonts/',
                src: '*',
                dest: buildDist + 'fonts',
                expand: true
            },
            rawAssets: {
                cwd: 'app/client/_assets/raw',
                src: '*',
                dest: buildDist + 'assets',
                expand: true
            },
            scripts: {
                cwd: buildStaging,
                src: 'app.min.js',
                dest: buildDist + 'scripts',
                expand: true
            },
            style: {
                cwd: buildDist + 'style',
                src: ['*.min.css', '*.min.css.map'],
                dest: finalDist + 'style',
                expand: true
            },
            views: {
                cwd: buildDist + 'views',
                src: '**',
                dest: finalDist + 'views',
                expand: true
            },
            dist: {
                cwd: buildDist,
                src: '**', // copy all files and subdirectories
                dest: finalDist,
                expand: true
            }
        },
        watch: {
            js: {
                files: ['app/client/*.js', 'app/client/!(build)/**/*.js'],
                tasks: ['browserify', 'babel', 'uglify', 'copy:scripts']
            },
            css: {
                files: ['./app/client/_assets/style/*.css'],
                tasks: ['cssmin', 'copy:style']
            },
            views: {
                files: ['app/server/src/views/**/*.pug'],
                tasks: ['pug', 'copy:views']
            }
        }
    });

    // Created a .min.css file for every CSS file in the style directory that
    // isn't base.css
    let cssminProp = 'cssmin.build.files';
    let files = [];
    cssBuilds.forEach(css => {
        files.push({
            src: [
                'app/client/_assets/style/base.css',
                `app/client/_assets/style/${css}.css`,
                'node_modules/bootstrap/dist/css/bootstrap.css'
            ],
            dest: buildDist + `style/${css}.min.css`
        });
    });
    grunt.config(cssminProp, files);

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
    let outDir = buildDist + 'views/';
    let filesMap = {};

    // Data to be passed to every template
    let data = {
        year: new Date().getFullYear(),
        appName: grunt.config('pkg').name
    };

    // All views that can't be rendered statically or shouldn't be rendered
    // directly
    let excludeViews = ['error.pug', 'layout.pug'];

    walkTree(srcDir).forEach(view => {
        // Get the file name relative to srcDir
        let relativeName = view.slice(srcDir.length);

        // Ignore dynamic views
        if (excludeViews.includes(relativeName)) {
            return;
        }

        let relativeBasename = relativeName.substring(0, relativeName.lastIndexOf('.'));
        let compiledPath = outDir + relativeBasename + '.html';
        filesMap[compiledPath] = view;
    });
    grunt.config('pug.compile.files', filesMap);
    grunt.config('pug.compile.options.data', data);

    var tasks = [
        'babel',
        'browserify',
        'contrib-clean',
        'contrib-copy',
        'contrib-cssmin',
        'contrib-jshint',
        'contrib-uglify',
        'contrib-pug',
        'contrib-watch',
        'coveralls',
        'karma',
        'lcov-merge',
        'mocha-test',
        'mocha-istanbul'
    ];

    for (var i = 0; i < tasks.length; i++) {
        grunt.loadNpmTasks(`grunt-${tasks[i]}`);
    }

    grunt.registerTask('default', ['test']);
    grunt.registerTask('test', ['mochaTest', 'karma']);
    grunt.registerTask('testCoverage', ['clean:testPrep', 'mocha_istanbul', 'karma']);
    grunt.registerTask('uploadCoverage', ['lcovMerge', 'coveralls']);
    grunt.registerTask('build', ['clean:buildPrep', 'browserify', 'babel', 'uglify', 'cssmin', 'pug', 'copy']);
};
