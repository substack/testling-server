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
var encode = require('bytewise').encode;
var shasum = require('shasum');

var Transform = require('stream').Transform;

var gitHandler = require('./lib/git.js');

var hyperspace = require('hyperspace');
var render = {
    repos: require('./render/repo.js')
};

var avatar = require('github-avatar');
var browsers = require('./available.json');

var sublevel = require('level-sublevel');
var level = require('level');
var levelAssoc = require('level-assoc');

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
            ? sublevel(level(opts.db, { encoding: 'json' }))
            : opts.db
        ;
        
        self.assoc = levelAssoc(self.db);
        
        self.job = self.assoc.add('job');
        self.job.hasMany('visit', [ 'type', 'visit' ]);
        self.job.hasMany('commit', [ 'type', 'commit' ]); // hasOne
        self.job.hasMany('output', [ 'type', 'output' ]);
        self.job.hasMany('result', [ 'type', 'result' ]);
        self.job.hasMany('exit', [ 'type', 'exit' ]);
        self.job.hasMany('error', [ 'type', 'error' ]);
        
        self.repo = self.assoc.add('repo');
        self.repo.hasMany('jobs', [ 'type', 'job' ]);
        
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
    if (parts[0] === '_') {
        req.url = '/' + parts.slice(1).join('/');
        return serveFiles(req, res);
    }
    
    if (parts[0] === 'avatar' && /\.jpg$/.test(parts[1])) {
        var user = parts[1].replace(/\.jpg$/, '');
        res.setHeader('content-type', 'image/jpeg');
        res.setHeader('max-age', 3 * 24 * 60 * 60);
        self.avatar(user).pipe(res);
    }
    else if (parts.length >= 2 && /\.git$/.test(parts[1])) {
        self.git(req, res);
    }
    else if (parts.length === 3 && parts[2] === 'jobs.json') {
        res.setHeader('content-type', 'application/json');
        res.setTimeout(0);
        
        var params = qs.parse(req.url.split('?')[1]);
        var repo = parts.slice(0, 2).join('/') + '.git';
        
        var s = self.assoc.get(repo).createStream();
        s.on('error', function (err) {
            res.statusCode = err.code || 500;
            if (err.name === 'NotFoundError') res.statusCode = 404;
            res.end(err + '\n');
        });
        s.pipe(res);
    }
    else if (parts.length === 3 && parts[2] === 'data.json') {
        res.setHeader('content-type', 'application/json');
        res.setTimeout(0);
        
        var params = qs.parse(req.url.split('?')[1]);
        var repo = parts.slice(0, 2).join('/') + '.git';
        
        self.assoc.get(repo, function (err, r) {
            if (err) {
                res.statusCode = err.code || 500;
                if (err.name === 'NotFoundError') res.statusCode = 404;
                return res.end(err + '\n');
            }
            
            var tf = new Transform({ objectMode: true });
            tf._transform = function (row, enc, next) {
                var cs = self.assoc.get(row.key).createStream();
                tf.push(JSON.stringify(row) + '\n');
                cs.pipe(res, { end: false });
                cs.on('data', function (buf) { tf.push(buf) });
                cs.on('end', next);
            };
            
            tf._flush = function () {
                res.end();
            };
            
            r.jobs().pipe(tf).pipe(res);
        });
    }
    else if (parts.length === 2) {
        var user = parts[0];
        var repo = parts[1];
        
        res.end('TODO: handle repo page\n');
    }
    else if (u === '') {
        res.setHeader('content-type', 'text/html');
        var tr = trumpet();
        tr.select('#browsers').createWriteStream().end(
            Object.keys(browsers).map(function (name) {
                return '<img src="/_/images/' + name + '.png">';
            }).join('\n')
        );
        
        self.assoc.list('repo')
            .pipe(through(function (row) {
                this.queue({
                    user: row.key.split('/')[0],
                    repo: row.key.split('/')[1],
                    jobs: row.value.jobs
                });
            }))
            .pipe(render.repos())
            .pipe(tr.createWriteStream('#repos'))
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
    var key = (obj && obj.job ? obj.job + '-' : '') + shasum(obj);
    return self.db.put(key, obj, cb);
};
