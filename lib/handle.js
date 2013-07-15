module.exports = function (fn) {
    var queue = [];
    var ready = false;
    
    fn(function () {
        ready = true;
        if (queue) queue.forEach(function (q) {
            var pause = req.pause;
            var paused = false;
            req.pause = function () {
                paused = true;
                return pause.apply(this, arguments);
            };
            q[0].call(q[1], q[2], q[3]);
            if (!paused) req.resume();
        });
        queue = null;
    });
    
    return function (cb) {
        return function (req, res) {
            if (ready) cb(req, res);
            else {
                req.pause();
                queue.push([ cb, this, req, res ]);
            }
        };
    };
};
