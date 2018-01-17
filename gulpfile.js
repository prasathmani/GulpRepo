var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var babel = require('gulp-babel');
var mocha = require('gulp-mocha');
var sass = require('gulp-sass');
var htmlmin = require('gulp-htmlmin');
var extname = require('gulp-extname');
var assemble = require('assemble');
var hbscompiler = assemble();
var marked = require('marked');
var path = require('path');
var template = require('gulp-template');
var runSequence = require('run-sequence');
var header = require('gulp-header');
var watch = require('gulp-watch');
var changed = require('gulp-changed');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var guppy = require('git-guppy')(gulp);
var gulpFilter = require('gulp-filter');
var shell = require('shelljs');

//file path
var DEST = './build';
var pkg = require('./package.json');

var fileHeader = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @Date <%= new Date().toLocaleString() %>',
  ' */',
  ''].join('\n');

gulp.task('load', function(cb) {
   hbscompiler.layouts('src/templates/layouts/*.hbs');
   hbscompiler.pages('src/components/**/*.hbs');
  //hbscompiler.pages('templates/pages/*.hbs');
  cb();
});

gulp.task('assemble', ['load'], function() {
  return hbscompiler.toStream('pages')
    .pipe(hbscompiler.renderFile())
    .pipe(htmlmin())
    .pipe(extname())
    .pipe(hbscompiler.dest(DEST));
});

//Output both a minified and non-minified version JS
gulp.task('js', function() {
  return gulp.src('src/components/**/*.js')
    // This will output the non-minified version
    .pipe(babel({ignore: 'gulpfile.js'}))
    .pipe(header(fileHeader, { pkg : pkg } ))
    .pipe(gulp.dest(DEST))
    // This will minify and rename to filename.min.js
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest(DEST));
});

//Output both a minified and non-minified version of CSS
gulp.task('sass', function () {
  return gulp.src('src/components/**/*.scss')
      .pipe(sass())
      .pipe(header(fileHeader, { pkg : pkg } ))
      .pipe(gulp.dest(DEST))
      .pipe(sass({outputStyle: 'compressed'}))
      .pipe(rename({ extname: '.min.css' }))
      .pipe(gulp.dest(DEST));
});

//ES6 - convert javascript from ES6 to ES5 using Babel
gulp.task('es6', () => {
  return gulp.src('src/components/**/*.js')
      .pipe(changed(DEST))
      .pipe(babel({ignore: 'gulpfile.js'}))
      .pipe(header(fileHeader, { pkg : pkg } ))
      .pipe(gulp.dest(DEST));
});

//JSHint is a program that flags suspicious usage in programs written in JavaScript
gulp.task('lint', function() {
  return gulp.src('src/components/**/*.js')
    .pipe(jshint({ esversion: 6 }))
    .pipe(jshint.reporter(stylish));
});

//pre git commit validation
gulp.task('pre-commit', function () {
  return gulp.src(guppy.src('pre-commit'))
    .pipe(gulpFilter(['src/components/**/*.js']))
    .pipe(jshint({ esversion: 6 }))
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('pre-push', guppy.src('pre-push', function (files, extra, cb) {
  var branch = shell.exec('git rev-parse --abbrev-ref HEAD');
  if (branch === 'master') {
    cb();
  } else {
    cb('Invalid branch')
  }
}));

gulp.task('test', function() {
  var result = shell.exec('git rev-parse --abbrev-ref HEAD');
	console.log('return code ' + result);
});

gulp.task('mocha', function() {
  return gulp.src(['test/*.js'], {read: false})
    .pipe(mocha({reporter: 'list'}))
});

gulp.task('watch', () => {
  return gulp.watch('src/components/**/*.js', ['es6']);
});

gulp.task('default', ['sass', 'js', 'assemble']);