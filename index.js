var ecstatic = require('ecstatic');
var serveFiles = ecstatic(__dirname + '/static');
var subdir = require('subdir');
var gitHandler = require('./lib/git.js');

module.exports = Server;

function Server (opts) {
    if (!(this instanceof Server)) return new Server(opts);
    this.prefix = opts.prefix || '/';
    
    this.git = gitHandler({
        repodir: opts.repodir || opts.datadir + '/repo',
        workdir: opts.workdir || opts.datadir + '/work',
        delay: 15
    });
}

Server.prototype.test = function (url) {
    var u = url.split('?')[0];
    return u === this.prefix || subdir(this.prefix, u);
};

Server.prototype.handle = function (req, res) {
    var u = req.url.split('?')[0];
    var parts = u.split('/');
    
    if (parts.length >= 3 && /\.git$/.test(parts[2])) {
        this.git(req, res);
    }
    else if (parts.length === 3) {
        var user = parts[1];
        var repo = parts[2];
        
        res.end('TODO: handle repo page\n');
    }
    else serveFiles(req, res);
};
