'use strict';

var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');

var tests = ['test/unit/containerTest.js',
             'test/unit/semverTest.js',
             'test/unit/sysrevTest.js',
             'test/unit/topologyTest.js']

gulp.task('default', function() {
    return gulp.src(tests).pipe(mocha({ reporter: 'list' }))
                                                  .on('error',gutil.log);
});

gulp.task('jshint', function() {
  return gulp.src(['./lib/**/*.js', './test/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
})

gulp.task('coverage', function () {
  gulp.src(['lib/**/*.js'])
    .pipe(istanbul())
    .on('finish', function () {
      gulp.src(tests)
        .pipe(mocha({
          reporter: 'list'
        }))
        .pipe(istanbul.writeReports());
    });
});
