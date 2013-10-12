var hyperspace = require('hyperspace');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/result.html', 'utf8');
var through = require('through');
var combine = require('stream-combiner');

module.exports = function () {
    var browsers = {};
    var hs = hyperspace(html, function (row) {
        return {
            '.version': Object.keys(row.value).sort(cmp).map(function (v) {
                return {
                    _text: v,
                    'class': 'version ' + ({
                        true: 'ok',
                        false: 'fail'
                    } || 'pending')
                };
            })
        };
        
        function cmp (a, b) {
            var na = parseInt(a) || a;
            var nb = parseInt(b) || b;
            return na < nb ? -1 : 1;
        }
    });
    return combine(through(write, end), hs);
    
    function write (row) {
        var name = row.value.browser[0];
        var version = row.value.browser[1];
        if (!browsers[name]) browsers[name] = {};
        browsers[name][version] = row.value.ok;
    }
    
    function end () {
        var tr = this;
        Object.keys(browsers).sort().forEach(function (name) {
            tr.queue({ key: name, value: browsers[name] });
        });
        tr.queue(null);
    }
};
