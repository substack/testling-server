module.exports = function (putter, browsers, addr) {
    var stack = Object.keys(browsers).reduce(function (acc, name) {
        return acc.concat(browsers[name].map(function (v) {
            return { name: name, version: v };
        }));
    }, []);
    
    return function () {
        if (stack.length === 0) return;
        
        var b = stack.shift();
        var href = addr + '&browser=' +  b.name + '&version=' +  b.version;
        
        putter({ type: 'visit', href: href });
        visit(href);
    })();
};

function visit (href) {
    console.log('click this link: ' + href);
}
