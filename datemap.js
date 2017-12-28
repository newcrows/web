//DateMap stores data identified by unixtime
function DateMap() {
    //backing data
    this.map = new Map();
}

//DateMap implemented functions
DateMap.prototype.setUnix = function(unix, data) {
    var keys = this.toKeyPair(unix);

    //retrieve sub map for day key
    var subMap = this.map.get(keys.main);

    //if no data for day yet, create sub map and add to map
    if (!subMap) {
        subMap = new Map();
        this.map.set(keys.main, subMap);
    }

    //set the intra-day data
    subMap.set(keys.sub, data);
}

DateMap.prototype.setUnixAll = function(unix, data) {
    var keys = this.toKeyPair(unix);

    this.map.set(keys.main, data);
}

DateMap.prototype.getUnix = function(unix) {
    var keys = this.toKeyPair(unix);

    var subMap = this.map.get(keys.main);
    if (!subMap)
        return null;

    return subMap.get(keys.sub);
}

DateMap.prototype.getUnixAll = function(unix) {
    var keys = this.toKeyPair(unix);

    //return the day key as unix too, for easy reference (hh, mm, ss = 0)
    //i.E. [one of the items].key + key => full unix for item
    return {key: keys.main, value: this.map.get(keys.main)};
}

DateMap.prototype.deleteUnix = function(unix) {
    var keys = this.toKeyPair(unix);

    var subMap = this.map.get(keys.main);
    if (subMap) {
        subMap.delete(keys.sub);
        if (subMap.size == 0)
            this.map.delete(keys.main);
    }
}

DateMap.prototype.deleteUnixAll = function(unix) {
    var keys = this.toKeyPair(unix);

    this.map.delete(keys.main);
}

DateMap.prototype.clear = function() {
    this.map = new Map();
}

DateMap.prototype.toKeyPair = function(unix) {
    //unixtimestamp as date
    var date = new Date(unix * 1000);

    //generate intra-day key
    var sub = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

    //generate day key normalized
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    var main = date.getTime() / 1000;    //normalized unixtime again

    return {main: main, sub: sub};
}