var spawn = require('child_process').spawn;
var through = require('through');
var concat = require('concat-stream');
var path = require('path');

var timeWindow = require('time-window-stream');
var utf8Stream = require('utf8-stream');
var concat = require('concat-stream');

module.exports = function (put, cwd, cb) {
    // also run this in a docker/jail/chroot since browserify can
    // run transforms that hit disk
    
    var args = [];
    var ps = spawn(
        __dirname + '/../node_modules/.bin/testling',
        [ path.resolve(cwd), '--html' ],
        { cwd: path.resolve(cwd) }
    );
    
    ps.on('close', function (code) {
        put({
            type: 'exit',
            code: code,
            stage: 'compile'
        });
        if (code !== 0) {
            cb('non-zero exit code');
            cb = function () {};
        }
    });
    
    ps.stderr
        .pipe(utf8Stream())
        .pipe(timeWindow(1000))
        .pipe(through(function (buf) {
            put({
                type: 'compile',
                data: buf.toString('utf8')
            });
        }))
    ;
    
    ps.stdout.pipe(concat(function (body) {
        if (!body || body.length === 0) return;
        var html = body.toString('utf8');
        cb(null, html);
        cb = function () {};
    }));
};
