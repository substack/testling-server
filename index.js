var ecstatic = require('ecstatic');
var serveFiles = ecstatic(__dirname + '/static');
var subdir = require('subdir');
var path = require('path');
var fs = require('fs');
var qs = require('querystring');

var mkdirp = require('mkdirp');
var parseShell = require('shell-quote').parse;
var through = require('through');
var JSONStream = require('JSONStream');
var trumpet = require('trumpet');

var gitHandler = require('./lib/git.js');
var put = require('./lib/put.js');
var projectStatus = require('./lib/status.js');
var repoList = require('./lib/repo_list.js');

var hyperspace = require('hyperspace');
var render = {
    repos: require('./render/repo.js')
};

var avatar = require('github-avatar');

var sublevel = require('level-sublevel');
var levelup = require('levelup');
var levelQuery = require('level-query');
var levelJoin = require('level-join');
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
        self.avatar = (function () {
            var db = self.db.sublevel('avatar');
            return function (user) {
                return avatar(user, { db: db, size: 64 });
            };
        })();
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
    
    if (parts[0] === 'avatar' && /\.jpg$/.test(parts[1])) {
        var user = parts[1].replace(/\.jpg$/, '');
        res.setHeader('content-type', 'image/jpeg');
        res.setHeader('max-age', 3 * 24 * 60 * 60);
        self.avatar(user).pipe(res);
    }
    else if (u === 'data.json') {
        res.setHeader('content-type', 'application/json');
        res.setTimeout(0);
        
        var q = self.query(req.url)
        q.on('error', function (err) {
            res.statusCode = err.code || 500;
            res.end(err + '\n');
        });
        q.pipe(res);
    }
    else if (u === 'repos.json') {
        var params = qs.parse(req.url.split('?')[1]);
        if (params.follow) res.setTimeout(0);
        
        res.setHeader('content-type', 'application/json');
        repoList(self.query, params).pipe(JSONStream.stringify()).pipe(res);
    }
    else if (parts[2] === 'status.json') {
        res.setHeader('content-type', 'application/json');
        var params = qs.parse(req.url.split('?')[1]);
        var repo = parts[0] + '/' + parts[1] + '.git';
        projectStatus(self.query, params.id, repo).pipe(res);
    }
    else if (parts.length >= 2 && /\.git$/.test(parts[1])) {
        self.git(req, res);
    }
    else if (parts.length === 3 && parts[2] === 'data.json') {
        res.setHeader('content-type', 'application/json');
        
        var params = qs.parse(req.url.split('?')[1]);
        var user = parts[0];
        var repo = parts[1];
        params.sort = [ 'repo', user + '/' + repo + '.git' ];
        params.raw = false;
        params.keys = false;
        
        var join = levelJoin(self.db);
        join.add('commit', [ 'job' ], [ 'type', 'commit' ]);
        join.add('output', [ 'job' ], [ 'type', 'output' ]);
        join.add('metadata', [ 'job' ], [ 'type', 'metadata' ]);
        join.add('visit', [ 'job' ], [ 'type', 'visit' ]);
        join.add('result', [ 'job' ], [ 'type', 'result' ]);
        join.add('exit', [ 'job' ], [ 'type', 'exit' ]);
        join.add('error', [ 'job' ], [ 'type', 'error' ]);
        join.pipe(JSONStream.stringify()).pipe(res);
        
        /*
        var q = self.query(params);
        q.on('error', function (err) { res.end(err + '\n') });
        q.pipe(res);
        */
    }
    else if (parts.length === 2) {
        var user = parts[0];
        var repo = parts[1];
        
        res.end('TODO: handle repo page\n');
    }
    else if (u === '') {
        res.setHeader('content-type', 'text/html');
        var tr = trumpet();
        repoList(self.query)
            .pipe(through(function (repo) {
                this.queue({ user: repo.split('/')[0], repo: repo });
            }))
            .pipe(render.repos())
            .pipe(tr.createWriteStream('#repo-list'))
        ;
        
        fs.createReadStream(__dirname + '/static/index.html')
            .pipe(tr).pipe(res)
        ;
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
