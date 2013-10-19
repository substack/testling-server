var hyperspace = require('hyperspace');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/job.html', 'utf8');
var result = require('./result.js');

module.exports = function (repo, dark) {
    var index = 0;
    return hyperspace(html, function (row) {
        var meta = row.value.meta;
        return {
            '.job': {
                class: 'job ' + (dark ^ (index++ % 2) ? 'dark' : 'light')
            },
            '.name': {
                href: '/' + repo,
                _text: repo
            },
            '.hash': row.key.split('.')[0],
            '.time': new Date(row.value.time),
            '.results': row.value.result().pipe(result(meta))
        };
    });
};
