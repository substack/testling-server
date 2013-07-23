var http = require('http');
var path = require('path');
var qs = require('querystring');

var ecstatic = require('ecstatic');
var xhrWriteStream = require('xhr-write-stream');
var through = require('through');
var switcher = require('switch-stream');

var utf8Stream = require('utf8-stream');
var timeWindow = require('time-window-stream');
var finished = require('tap-finished');

module.exports = function (put, html, dir) {
    var st = ecstatic(path.resolve(dir));
    var xws = xhrWriteStream();
    
    var server = http.createServer(function (req, res) {
        var u = req.url.split('?')[0];
        
        if (u === '/') {
            res.end(html)
        }
        else if (u === '/sock') {
            req.pipe(xws(function (stream) {
                var p = stream.pipe(parser(put));
                p.on('result', server.emit.bind(server, 'result'));
            }));
            req.on('end', onend);
            req.on('close', onend);
            req.on('error', onend);
            
            var ended = false;
            function onend () {
                if (ended) return;
                ended = true;
                res.end();
            }
        }
        else st(req, res);
    });
    return server;
};

function parser (put) {
    var line = '';
    var firstLine = through(function (buf) {
        var s = typeof buf === 'string' ? buf : buf.toString('utf8');
        var ix = s.indexOf('\n');
        if (ix >= 0) {
            var params = qs.parse((line + s).slice(0, ix).replace(/^#/, ''));
            var bv = [ params.browser, params.version ];
            var p = parseData(bv);
            p.write(s.slice(ix+1));
            sw.set(p);
        }
        else line += s;
    });
    
    var sw = switcher(firstLine);
    return sw;
    
    function parseData (bv) {
        var u;
        (u = utf8Stream())
            .pipe(timeWindow(1000))
            .pipe(through(write))
            .pipe(finished(function (results) {
                put({
                    type: 'result',
                    browser: bv,
                    ok: results.ok
                });
                sw.emit('result', bv, results);
            }))
        ;
        return u;
        
        function write (buf) {
            put({
                type: 'output',
                browser: bv,
                data: buf.toString('utf8')
            });
            this.queue(buf);
        }
    }
}
