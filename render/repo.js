var hyperspace = require('hyperspace');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/repo.html', 'utf8');
var job = require('./job.js');

module.exports = function (opts) {
    if (!opts) opts = {};
    var index = 0;
    var limit = opts.expand ? undefined : 1;
    return hyperspace(html, function (row) {
        var dark = index++ % 2 === 0;
        return {
            '.repo': (dark ? { 'class': 'repo dark' } : {}),
            '.gravatar': { href: '/~' + row.repo.split('/')[0] },
            '.gravatar img': { src: '/avatar/' + row.user + '.jpg' },
            '.jobs': row.jobs({ limit: limit }).pipe(job(row.repo, dark))
        };
    });
};
