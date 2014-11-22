'use strict';

var request = require('request');

module.exports = function(grunt) {
    // show elapsed time at the end
    require('time-grunt')(grunt);
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    var reloadPort = 35729,
        files;

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        develop: {
            server: {
                file: 'bin/www'
            }
        },
        watch: {
            options: {
                nospawn: true,
                livereload: reloadPort
            },
            server: {
                files: [
                    'bin/www',
                    'app.js',
                    'routes/*.js'
                ],
                tasks: ['develop', 'delayed-livereload']
            },
            js: {
                files: ['public/js/*.js'],
                options: {
                    livereload: reloadPort
                }
            },
            css: {
                files: [
                    'public/css/*.css'
                ],
                options: {
                    livereload: reloadPort
                }
            },
            views: {
                files: ['views/*.jade'],
                options: {
                    livereload: reloadPort
                }
            }
        },
        // Automatically inject Bower components into the app
        bowerInstall: {
            target: {
                // Point to the files that should be updated when
                // you run `grunt bowerInstall`
                src: [
                    'views/layout.jade', // .jade support...
                    'views/**/*.html', // .html support...
                    'views/**/*.jade', // .jade support...
                    'styles/main.scss', // .scss & .sass support...
                    'config.yml' // and .yml & .yaml support out of the box!
                ],

                // Optional:
                // ---------
                cwd: '',
                dependencies: true,
                devDependencies: false,
                exclude: [],
                fileTypes: {},
                ignorePath: ''
            }
        },
    });

    grunt.config.requires('watch.server.files');
    files = grunt.config('watch.server.files');
    files = grunt.file.expand(files);

    grunt.loadNpmTasks('grunt-bower-install');

    grunt.registerTask('delayed-livereload', 'Live reload after the node server has restarted.', function() {
        var done = this.async();
        setTimeout(function() {
            request.get('http://localhost:' + reloadPort + '/changed?files=' + files.join(','), function(err, res) {
                var reloaded = !err && res.statusCode === 200;
                if (reloaded) {
                    grunt.log.ok('Delayed live reload successful.');
                } else {
                    grunt.log.error('Unable to make a delayed live reload.');
                }
                done(reloaded);
            });
        }, 500);
    });

    grunt.registerTask('default', [
        'develop',
        // 'watch'
    ]);
};
