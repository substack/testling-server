var http = require('http');
var testling = require('./')({
    prefix: '/',
    datadir: './data'
});
var argv = require('minimist')(process.argv.slice(2));

var server = http.createServer(function (req, res) {
    if (testling.test(req.url)) testling.handle(req, res);
    else res.end('not found\n');
});
server.listen(argv.port);
