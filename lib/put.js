var crypto = require('crypto');
var stringify = require('json-stable-stringify');
var concat = require('concat-stream');

module.exports = function (db, obj, cb) {
    var str = stringify(obj);
    var h = crypto.createHash('sha1', { encoding: 'hex' });
    h.pipe(concat(function (body) {
        hash = body.toString('utf8');
    }));
    h.end(str);
    db.put(hash, str, { valueEncoding: 'utf8' }, cb);
    return hash;
};
