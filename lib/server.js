var http = require('http');
var path = require('path');
var ecstatic = require('ecstatic');
var xws = require('xhr-write-stream');

module.exports = function (html, dir) {
    dir = path.resolve(dir);
    var server = http.createServer(function (req, res) {
        if (req.url.split('?')[0] === '/') {
            res.end(html);
        }
        else {
            
        }
    });
    server.listen(8000);
};
