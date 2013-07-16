var crypto = require('crypto');
var stringify = require('json-stable-stringify');
var concat = require('concat-stream');

module.exports = function (db, obj, cb) {
    var str = stringify(obj);
    var h = crypto.createHash('sha1', { encoding: 'hex' });
    h.pipe(concat(function (body) {
        var hash = body.toString('utf8');
        db.put(hash, str, { valueEncoding: 'utf8' }, function (err) {
            if (!cb) return;
            if (err) cb(err)
            else cb(null, hash)
        });
    }));
    h.end(str);
};
