var through = require('through');

module.exports = function getStatus (query, id, repo) { 
    if (!id) {
        var tr = through();
        getId(query, repo, function (id) {
            if (!id) {
                tr.queue('{}\n');
                tr.queue(null);
            }
            else getStatus(query, id, repo).pipe(tr);
        });
        return tr;
    }
    
    var q = query({
        sort: [ 'job', id ],
        format: 'raw',
        filter: [ 'type', 'result' ]
    });
    
    var results = {};
    var tr = through(write, end);
    return q.pipe(tr);
    
    function write (row) {
        var r = row.value;
        var b = r.browser[0], v = r.browser[1];
        if (!results[b]) results[b] = {};
        results[b][v] = r.ok;
    }
    
    function end () {
        this.queue(JSON.stringify(results, null, 2) + '\n');
        this.queue(null);
    }
};

function getId (query, repo, cb) {
    var max = { time: Number.MIN_VALUE };
    var q = query({
        sort: [ 'repo', repo ],
        filter: [ 'type', 'commit' ],
        raw: true
    });
    q.pipe(through(write, end));
    
    function write (row) {
        var r = row.value;
        if (r.job && r.time > max.time) max = r;
    }
    function end () { cb(max.job) }
}
