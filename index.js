var ecstatic = require('ecstatic');
var serveFiles = ecstatic(__dirname + '/static');
var subdir = require('subdir');

module.exports = Server;

function Server (opts) {
    if (!(this instanceof Server)) return new Server(opts);
    this.prefix = opts.prefix || '/';
}

Server.prototype.test = function (url) {
    return url === this.prefix || subdir(this.prefix, url);
};

Server.prototype.handle = function (req, res) {
    return serveFiles(req, res);
};
