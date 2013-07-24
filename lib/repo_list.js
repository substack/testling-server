var through = require('through');

module.exports = function (query) {
    var seen = {};
    var q = query({
        sort: [ 'type', 'commit' ],
        raw: true
    });
    return q.pipe(through(function (row) {
        var repo = row.value.repo.replace(/\.git$/, '');
        if (seen[repo]) return;
        seen[repo] = true;
        this.queue(repo);
    }));
};
