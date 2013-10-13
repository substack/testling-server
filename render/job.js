var hyperspace = require('hyperspace');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/job.html', 'utf8');
var result = require('./result.js');

module.exports = function (repo) {
    return hyperspace(html, function (row) {
        return {
            '.name': {
                href: '/' + repo,
                _text: repo
            },
            '.hash': row.key.split('.')[0],
            '.time': new Date(row.value.time),
            '.results': row.value.result().pipe(result())
        };
    });
};
