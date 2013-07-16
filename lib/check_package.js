module.exports = function (pkg, cb) {
    if (!pkg || typeof pkg !== 'object') {
        cb('package.json expected to be an object, got: '
            + typeof pkg
        );
        return false;
    }
    
    if (!pkg.testling || typeof pkg.testling !== 'object') {
        return cb('package.json "testling" field expected to be an object,'
            + ' got: ' + typeof pkg.testling
        );
        return false;
    }
    
    if (typeof pkg.testling.browsers !== 'object') {
        return cb('package.json testling.browser field expects an object,'
            + 'got: ' + typeof pkg.testling.browsers
        );
        return false;
    }
    
    if (!pkg.testling.files && !pkg.testling.scripts && !pkg.testling.html) {
        cb('package.json "testling" object must contain'
            + ' at least one of these fields:'
            + ' "files", "scripts", "html"'
        );
        return false;
    }
    
    return true;
};
