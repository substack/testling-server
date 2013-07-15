var ecstatic = require('ecstatic');
var serveFiles = ecstatic(__dirname + '/static');
var subdir = require('subdir');
var path = require('path');

var gitHandler = require('./lib/git.js');

var sublevel = require('level-sublevel');
var levelup = require('levelup');
var levelQuery = require('level-query');

module.exports = Server;

function Server (opts) {
    if (!(this instanceof Server)) return new Server(opts);
    this.prefix = opts.prefix || '/';
    
    this.git = gitHandler({
        repodir: opts.repodir || path.join(opts.datadir, 'repo'),
        workdir: opts.workdir || path.join(opts.datadir, 'work'),
        delay: 15
    });
    
    if (opts.datadir && !opts.db) {
        opts.db = path.join(opts.datadir, 'db');
    }
    if (!opts.db) throw new Error(
        'Mandatory "db" parameter not specified.\n'
        + 'Supply a "datadir" or "db" parameter.\n'
    );
    
    this.db = typeof opts.db === 'string'
        ? sublevel(levelup(opts.db, { encoding: 'json' }))
        : opts.db
    ;
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
