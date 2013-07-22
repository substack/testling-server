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
        [ '-u' ],
        { cwd: path.resolve(cwd) }
    );
console.log('cd ' + path.resolve(cwd));
console.log(__dirname + '/../node_modules/.bin/testling -u');
    
    var stderr;
    ps.stderr.pipe(concat(function (body) {
        stderr = body;
    }));
ps.stdout.pipe(process.stdout);
ps.stderr.pipe(process.stderr);
    
    ps.stdout.pipe(split()).pipe(through(function (buf) {
        var line = buf.toString('utf8');
console.log('line=' + line);
        if (!/^https?:/.test(line)) {
            cb(new Error('unexpected output not a url: ' + body));
        }
        else cb(null, line.trim());
        cb = function () {};
    }));
    
    ps.on('exit', function (code) {
console.log('EXIT=', code);
    });
    ps.on('close', function (code) {
console.log('CODE=', code);
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
