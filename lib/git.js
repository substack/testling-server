var path = require('path');
var fs = require('fs');
var qs = require('querystring');
var url = require('url');

var cicada = require('cicada');
var normalizeBrowsers = require('normalize-browser-names');

var verify = function (info, cb) { cb() };

var mkdirp = require('mkdirp');
var through = require('through');

var createHandle = require('./handle.js');
var checkPackage = require('./check_package.js');
var prepare = require('./prepare.js');
var compile = require('./compile.js');
var visit = require('./visit.js');
var createServer = require('./server.js');
var available = require('../available.json');

module.exports = function (self, opts) {
    var last = {};
    var ci = cicada({
        repodir : function (repo) {
            if (!last[repo]) last[repo] = { time : 0 };
            
            if (Date.now() - last[repo].time >= opts.delay * 1000) {
                last[repo].id = Math.floor(Math.pow(16,8) * Math.random());
            }
            last[repo].time = Date.now();
            
            return path.join(opts.repodir, repo + '.' + last[repo].id);
        },
        workdir : function (target) {
            var user = target.repo.split('/')[0].toLowerCase();
            return path.join(opts.workdir, user, 'repos', target.id);
        }
    });
    
    ci.on('info', function (info) {
        verify(info, function () {
            info.accept();
        });
    });
    
    ci.on('push', function (push) {
        verify(push, function () {
            push.accept();
        });
    });
    
    ci.on('commit', function (commit) {
        self.put({
            type: 'commit',
            job: commit.id,
            dir: commit.dir,
            repo: commit.repo,
            hash: commit.hash,
            branch: commit.branch,
            time: Date.now()
        });
        
        var pkgfile = path.join(commit.dir, 'package.json');
        fs.readFile(pkgfile, function (err, src) {
            if (err) return self.put({
                type: 'error',
                job: commit.id,
                stage: 'reading package.json',
                message: err && err.message || String(err),
                time: Date.now()
            });
            
            try { var pkg = JSON.parse(src) }
            catch (err) {
                return self.put({
                    type: 'error',
                    job: commit.id,
                    stage: 'parsing package.json',
                    message: err && err.message || String(err),
                    time: Date.now()
                });
            }
            if (!checkPackage(pkg, function (err) {
                self.put({
                    type: 'error',
                    job: commit.id,
                    stage: 'checking package.json',
                    message: err,
                    time: Date.now()
                });
            })) return;
            
            try {
                var browsers = normalizeBrowsers(
                    pkg.testling.browsers, available
                );
            }
            catch (err) {
                return self.put({
                    type: 'error',
                    job: commit.id,
                    stage: 'normalizing browsers',
                    message: err && err.message || String(err),
                    time: Date.now()
                });
            }
            var meta = pkg.testling;
            meta.browsers = browsers;
            
            self.db.batch([
                {
                    type: 'put',
                    key: commit.repo,
                    value: { type: 'repo' }
                },
                {
                    type: 'put',
                    key: commit.id,
                    value: {
                        type: 'job',
                        repo: commit.repo,
                        meta: meta,
                        time: Date.now()
                    }
                }
            ]);
            
            var putter = function (row) {
                row.job = commit.id;
                row.time = Date.now();
                self.put(row);
            };
            prepare(putter, commit.dir, function (err) {
                if (err) return;
                compile(putter, commit.dir, function (err, html) {
                    if (err) return;
                    
                    var server = createServer(putter, html, commit.dir);
                    server.listen(0, function () {
                        var addr = 'http://localhost:'
                            + server.address().port
                            + '/#commit=' + commit.hash
                        ;
                        var next = visit(putter, browsers, addr);
                        server.on('result', next);
                        next();
                    });
                });
            });
        });
    });
    
    var handle = createHandle(function (done) {
        var pending = 2;
        mkdirp(opts.repodir, ready);
        mkdirp(opts.workdir, ready);
        function ready () { if (--pending === 0) done() }
    });
    
    return handle(function (req, res) {
        if (m = /^\/(.+)\.git\b/.test(req.url.split('?')[0])) {
            ci.handle(req, res);
        }
    });
};
