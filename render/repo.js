var hyperspace = require('hyperspace');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/repo.html', 'utf8');
var job = require('./job.js');

module.exports = function () {
    return hyperspace(html, function (row) {
        return {
            '.name': row.repo,
            '.gravatar': { href: 'https://github.com/' + row.repo },
            '.gravatar img': { src: '/avatar/' + row.user + '.jpg' },
            '.jobs': row.jobs().pipe(job())
        };
    });
};
