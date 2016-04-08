// For more information on how to configure a task runner, please visit:
// https://github.com/gulpjs/gulp

var gulp    = require('gulp');
var babel   = require('gulp-babel');
var es2015  = require('babel-preset-es2015');
var gutil   = require('gulp-util');
var del     = require('del');
var concat  = require('gulp-concat');
var es      = require('event-stream');
var runSeq  = require('run-sequence');
var shell   = require('gulp-shell');

gulp.task('clean', function () {
    // Clear the destination folder
    return del(['dist/**/*.*']);
});

gulp.task('copy', function () {
    return es.concat(
        gulp.src(['src/static/**/*.*', '!src/static/js/**/*.*'])
            .pipe(gulp.dest('dist/static')),
        gulp.src(['src/*.*'])
            .pipe(gulp.dest('dist'))
    );
});

gulp.task('scripts', function () {
    // Concatenate, babelify and copy all JavaScript (except vendor scripts)
    return gulp.src(['src/static/js/**/*.js'])
        .pipe(concat('app.js'))
        .pipe(babel({
            presets: [es2015]
        }))
        .pipe(gulp.dest('dist/static/js'))
});

gulp.task('frontend', function() {
    var frontendPackages = ["foundation-sites", "jquery", "jquery.typewatch", "ractive", "moment", "director", "arrive"];

    var glob = "node_modules/+(" + frontendPackages.join("|") + ")/**/*";
    gutil.log(glob);

    return gulp.src([glob])
        .pipe(gulp.dest('dist/static/lib'));
});

gulp.task('watch', function() {
    gulp.watch(['src/static/**/*.*', '!src/static/js/**/*.*'], ['copy']);
    gulp.watch('src/static/js/*.js', ['scripts']);
});

gulp.task('run', shell.task('node server.js', {cwd: 'dist'}));

gulp.task('noCompile', function(cb) {
    runSeq('copy', 'run', cb);
});
gulp.task('nc', ['noCompile']);

gulp.task('dist', function(cb) {
    runSeq('clean', ['copy', 'frontend', 'scripts'], cb);
});
gulp.task('default', function(cb) {
    runSeq('clean', ['copy', 'frontend', 'scripts', 'watch'], 'run', cb);
});

gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});
