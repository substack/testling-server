var spawn = require('child_process').spawn;
var through = require('through');
var concat = require('concat-stream');
var split = require('split');
var path = require('path');

module.exports = function (put, cwd, cb) {
    // also run this in a docker/jail/chroot since browserify can
    // run transforms that hit disk
    
    var args = [];
    var ps = spawn(
        __dirname + '/../node_modules/.bin/testling',
        [ path.resolve(cwd), '-u' ],
        { cwd: path.resolve(cwd) }
    );
    
    var stderr;
    ps.stderr.pipe(concat(function (body) {
        stderr = body;
    }));
    
    ps.stdout.pipe(split()).pipe(through(function (buf) {
        var line = buf.toString('utf8');
        if (!/^https?:/.test(line)) {
            cb(new Error('unexpected output not a url: ' + line));
        }
        else cb(null, line.trim());
        cb = function () {};
    }));
    
    ps.on('close', function (code) {
        if (code !== 0) {
            put({
                type: 'error',
                stage: 'compile',
                message: stderr.toString('utf8')
            });
            cb(new Error(stderr.toString('utf8')));
            cb = function () {};
        }
    });
};
