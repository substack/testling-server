var path = require('path');
var fs = require('fs');
var qs = require('querystring');
var url = require('url');

var cicada = require('cicada');

var verify = function (info, cb) { cb() };

var mkdirp = require('mkdirp');
var through = require('through');

var createHandle = require('./handle.js');

module.exports = function (opts) {
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
        console.log(
            'commit ' + commit.repo + '#' + commit.hash
            + ' (' + commit.branch + ')'
        );
        
        var pkgfile = path.join(commit.dir, 'package.json');
        fs.readFile(pkgfile, function (err, src) {
            // todo: npm install and run browserify inside a
            // docker/jail/chroot/zerovm container
            
            /*
            var job = parsePackage(err, src, commit);
            job.on('ready', function () { queue.push(job) });
            job.on('fail', function (msg) {
                console.error(msg);
            });
            */
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
