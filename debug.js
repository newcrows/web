//print method calls
var _debugMap = new Map();  //count function calls
var _silent = false;
function augment(window, list, isBlacklist) {
    var name, fn;
    for (name in window) {
        fn = window[name];
        if (typeof fn === 'function') {
            window[name] = (function(name, fn) {
                var args = arguments;
                return function() {
                    var includes = list.includes(name);
                    if (!includes && isBlacklist || includes && !isBlacklist) {
                        var arr = Array.from(arguments);
                        if (!_silent)
                            console.log(window.constructor.name + ":" + name + (arr.length > 0 ? "(" + arr.toString() : "(") + ")");

                        var stats = _debugMap.get(name);
                        if (!stats)
                            stats = [0,0];

                        stats[0]++; //increment call count

                        //measure time
                        var before = new Date().getTime();
                        var ret = fn.apply(this, arguments);
                        var elapsed = new Date().getTime() - before;

                        stats[1]+=elapsed;                       
                        _debugMap.set(name, stats);

                        return ret;
                    }
                    return fn.apply(this, arguments);
                }
            })(name, fn);
        }
    }
}

//hook target to print method calls
function debug(target, list, isBlacklist) {
    //DEBUG
    augment(target, list ? list : [], isBlacklist == null ? true : isBlacklist);
}

//print method call count, highest first
function printDebug() {
    var entries = [..._debugMap.entries()];

    var sorted = entries.sort(function(a, b) {
        /*var avgA = a[1][1] / a[1][0];
        var avgB = b[1][1] / b[1][0];
        return avgA - avgB;*/
        return a[1][1] - b[1][1];
    });

    console.clear();

    var sum = 0;
    for (var c = 0; c < sorted.length; c++) {
        var count = sorted[c][1][0];
        var total = sorted[c][1][1];
        var avg = total / count;
        sum += total;
        console.log("cnt:" + count + ", avg:" + avg + ", total:" + total + " (" + sorted[c][0] + ")");
    }
    console.log("total (all):" + sum);

    _debugMap.clear();
}