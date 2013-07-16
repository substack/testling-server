var ecstatic = require('ecstatic');
var serveFiles = ecstatic(__dirname + '/static');
var subdir = require('subdir');
var path = require('path');
var mkdirp = require('mkdirp');
var parseShell = require('shell-quote').parse;

var gitHandler = require('./lib/git.js');
var put = require('./lib/put.js');

var sublevel = require('level-sublevel');
var levelup = require('levelup');
var levelQuery = require('level-query');
var inherits = require('inherits');

var EventEmitter = require('events').EventEmitter;

module.exports = Server;
inherits(Server, EventEmitter);

function Server (opts) {
    var self = this;
    if (!(self instanceof Server)) return new Server(opts);
    self.prefix = opts.prefix || '/';
    
    self.git = gitHandler(self, {
        repodir: opts.repodir || path.join(opts.datadir, 'repo'),
        workdir: opts.workdir || path.join(opts.datadir, 'work'),
        delay: 15
    });
    
    self.command = parseShell(opts.command || 'testling -u');
    
    if (opts.datadir && !opts.db) {
        opts.db = path.join(opts.datadir, 'db');
    }
    if (!opts.db) throw new Error(
        'Mandatory "db" parameter not specified.\n'
        + 'Supply a "datadir" or "db" parameter.\n'
    );
    
    self.once('ready', function () {
        self.db = typeof opts.db === 'string'
            ? sublevel(levelup(opts.db, { encoding: 'json' }))
            : opts.db
        ;
        self.query = levelQuery(self.db);
        self.ready = true;
    });
    
    if (typeof opts.db === 'string') {
        mkdirp(opts.db, function (err) {
            if (err) return self.emit('error', err);
            self.emit('ready');
        });
    }
    else self.emit('ready');
}

Server.prototype.test = function (url) {
    var u = url.split('?')[0];
    return u === this.prefix || subdir(this.prefix, u);
};

Server.prototype.handle = function (req, res) {
    var self = this;
    if (!self.ready) {
        return self.once('ready', self.handle.bind(self, req, res));
    }
    
    var u = path.relative(self.prefix, req.url.split('?')[0]);
    var parts = u.split('/');
    
    if (u === 'data.json') {
        res.setHeader('content-type', 'application/json');
        res.setTimeout(0);
        
        var q = self.query(req.url)
        q.on('error', function (err) {
            res.statusCode = err.code || 500;
            res.end(err + '\n') });
        q.pipe(res);
    }
    else if (parts.length >= 2 && /\.git$/.test(parts[1])) {
        self.git(req, res);
    }
    else if (parts.length === 2) {
        var user = parts[0];
        var repo = parts[1];
        
        res.end('TODO: handle repo page\n');
    }
    else serveFiles(req, res);
};

Server.prototype.put = function (obj, cb) {
    var self = this;
    if (!self.ready) {
        return self.once('ready', self.put.bind(self, obj, cb));
    }
    return put(self.db, obj, cb);
};
