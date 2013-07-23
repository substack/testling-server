var http = require('http');
var path = require('path');
var ecstatic = require('ecstatic');
var xhrWriteStream = require('xhr-write-stream');

module.exports = function (html, dir) {
    var st = ecstatic(path.resolve(dir));
    var xws = xhrWriteStream();
    
    var server = http.createServer(function (req, res) {
        var u = req.url.split('?')[0];
        
        if (u === '/') {
            res.end(html)
        }
        else if (u === '/sock') {
            req.pipe(xws(function (stream) {
                stream.pipe(through(write, end));
                
                function write (buf) {
                    
                }
                
                function end () {
                    
                }
            }));
        }
        else st(req, res);
    });
    server.listen(8000);
};
