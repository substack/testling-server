var spawn = require('child_process').spawn;
var through = require('through');
var concat = require('concat-stream');
var split = require('split');
var path = require('path');

var switcher = require('switch-stream');
var timeWindow = require('time-window-stream');
var utf8Stream = require('utf8-stream');

module.exports = function (put, cwd, cb) {
    // also run this in a docker/jail/chroot since browserify can
    // run transforms that hit disk
    
    var args = [];
    var ps = spawn(
        __dirname + '/../node_modules/.bin/testling',
        [ path.resolve(cwd), '-u' ],
        { cwd: path.resolve(cwd) }
    );
    
    ps.on('close', function (code) {
        put({
            type: 'exit',
            code: code,
            stage: sw.current === saver ? 'run' : 'compile'
        });
    });
    
    var firstLine = through(function (buf) {
        var line = buf.toString('utf8');
        if (!/^https?:/.test(line)) {
            cb(new Error('unexpected output not a url: ' + line));
        }
        else {
            cb(null, line.trim());
            sw.set(saver);
        }
        cb = function () {};
    });
    
    var saver; (saver = utf8Stream()).pipe(through(function (buf) {
        
    }));
    var sw = ps.stdout.pipe(split()).pipe(switcher(firstLine));
    ps.stderr.pipe(saver);
    return sw;
};
