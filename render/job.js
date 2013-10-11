var hyperspace = require('hyperspace');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/job.html', 'utf8');

module.exports = function () {
    return hyperspace(html, function (row) {
        return {
            '.hash': row.key.split('.')[0],
            '.time': new Date(row.value.time)
        };
    });
};
