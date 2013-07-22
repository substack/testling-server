var spawn = require('child_process').spawn;
var through = require('through');
var concat = require('concat-stream');
var path = require('path');

var switcher = require('switch-stream');
var timeWindow = require('time-window-stream');
var utf8Stream = require('utf8-stream');
var finished = require('tap-finished');

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
    
    var line = '';
    var firstLine = through(function (buf) {
        for (var i = 0, l = buf.length; i < l; i++) {
            if (buf[i] === 10) {
                if (!/^https?:/.test(line)) {
                    cb(new Error('unexpected output not a url: ' + line));
                }
                else {
                    cb(null, line.trim());
                    sw.set(saver);
                    saver.write(buf.slice(i + 1));
                }
                cb = function () {};
            }
            else line += String.fromCharCode(buf[i])
        }
    });
    
    var pending = 2;
    var saver; (saver = utf8Stream())
        .pipe(timeWindow(1000))
        .pipe(through(function (buf) {
            put({
                type: 'output',
                data: buf.toString('utf8')
            });
        }))
    ;
    saver.pipe(finished(function (results) {
        put({
            type: 'result',
            ok: results.ok
        });
    }));
    
    var sw = ps.stdout.pipe(switcher(firstLine));
    ps.stderr.pipe(saver);
    return sw;
};
