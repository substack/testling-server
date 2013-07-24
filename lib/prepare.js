var spawn = require('child_process').spawn;
var through = require('through');
var timeWindow = require('time-window-stream');
var utf8Stream = require('utf8-stream');

// todo: use docker/jail/chroot containers for the `npm install`

module.exports = function (put, cwd, done) {
    var ps = spawn('npm', [ 'install', '.' ], { cwd: cwd });
    var exitCode;
    
    var saver = through(null, function () {});
    ps.on('close', function (code) {
        exitCode = code;
        saver.queue(null);
    });
    
    saver.pipe(utf8Stream())
        .pipe(timeWindow(1000))
        .pipe(through(write, end))
    ;
    
    ps.stdout.pipe(saver);
    ps.stderr.pipe(saver);
    
    function write (buf) {
        put({
            type: 'install',
            data: buf.toString('utf8')
        });
    }
    
    function end () {
        if (exitCode === 0) {
            put({ type: 'npm', exit: 0 });
            done();
        }
        else {
            put({
                type: 'error',
                stage: 'npm install',
                message: 'non-zero exit code: ' + code
            });
            done(new Error('non-zero exit code: '+ code));
        }
    }
};
