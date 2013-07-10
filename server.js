var http = require('http');
var testling = require('./')({ prefix: '/' });
var argv = require('minimist')(process.argv.slice(2));

var server = http.createServer(function (req, res) {
    if (testling.test(req.url)) testling.handle(req, res);
});
server.listen(argv.port);
