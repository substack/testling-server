var through = require('through');

module.exports = function (query, opts) {
    if (!opts) opts = {};
    
    var seen = {};
    var q = query({
        sort: [ 'type', 'commit' ],
        raw: true,
        follow: opts.follow
    });
    return q.pipe(through(function (row) {
        var repo = row.value.repo.replace(/\.git$/, '');
        if (seen[repo]) return;
        seen[repo] = true;
        this.queue(repo);
    }));
};
