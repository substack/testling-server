var hyperspace = require('hyperspace');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/result.html', 'utf8');
var through = require('through');
var combine = require('stream-combiner');
var available = require('../available.json');
var normalize = require('normalize-browser-names');

module.exports = function (meta) {
    var mbrowsers = normalize(meta.browsers);
    var browsers = Object.keys(mbrowsers).reduce(function (acc, key) {
        acc[key] = mbrowsers[key].reduce(function (acc_, k) {
            acc_[k] = 'pending';
            return acc_;
        }, {});
        return acc;
    }, {});
    
    var hs = hyperspace(html, function (row) {
        return {
            '.version': Object.keys(row.value).sort(cmp).map(function (v) {
                return {
                    _text: v,
                    'class': 'version ' + row.value[v]
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
        browsers[name][version] = row.value.ok ? 'ok' : 'fail';
    }
    
    function end () {
        var tr = this;
        available.forEach(function (b) {
            tr.queue({ key: b.name, value: browsers[b.name] || [] });
        });
        tr.queue(null);
    }
};
