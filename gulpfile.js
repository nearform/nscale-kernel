'use strict';

var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');

gulp.task('default', function() {
    return gulp.src(['test/unit/containerTest.js', 
                     'test/unit/semverTest.js',
                     'test/unit/sysrevTest.js',
                     'test/unit/topologyTest.js']).pipe(mocha({ reporter: 'list' }))
                                                  .on('error',gutil.log);
});



gulp.task('test', function () {
    gulp.src(['lib/**/*.js','main.js'])
    .pipe(istanbul())
    .on('end', function () {
         gulp.src(['test/**/*.js'])
        .pipe(mocha({
            reporter: 'list'
        }))
        .pipe(istanbul.writeReports());
   });
});
