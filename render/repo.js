var hyperspace = require('hyperspace');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/repo.html');

module.exports = function (row) {
    return hyperspace(html, {
        '.name': row.repo
    });
};
