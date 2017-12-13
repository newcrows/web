//returns wether or not two dates are equal by year, month, day
function areDatesEqual(d0, d1) {
    return d0.getFullYear() == d1.getFullYear() && d0.getMonth() == d1.getMonth() && d0.getDate() == d1.getDate();
}

//return difference between two dates in days
function dateDiffInDays(d0, d1) {
    // Discard the time and time-zone information.
    var utc0 = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate());
    var utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());

    return Math.floor((utc0 - utc1) / MS_PER_DAY);
}

//object to store data identified by unixtime
function DateMap() {

    //backing data
    this.map = new Map();

    /* GETTERS / SETTERS */

    //set a single item
    this.setUnix = function(unix, data) {
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

    //set a full day
    this.setUnixAll = function(unix, data) {
        var keys = this.toKeyPair(unix);

        this.map.set(keys.main, data);
    }

    //get a single item
    this.getUnix = function(unix) {
        var keys = this.toKeyPair(unix);

        var subMap = this.map.get(keys.main);
        if (!subMap)
            return null;

        return subMap.get(keys.sub);
    }

    //get a full day
    this.getUnixAll = function(unix) {
        var keys = this.toKeyPair(unix);

        return this.map.get(keys.main);
    }

    //delete a single item
    this.deleteUnix = function(unix) {
        var keys = this.toKeyPair(unix);

        var subMap = this.map.get(keys.main);
        if (subMap)
            subMap.delete(keys.sub);
    }

    //delete a full day
    this.deleteUnixAll = function(unix) {
        var keys = this.toKeyPair(unix);

        this.map.delete(keys.main);
    }

    //clear all
    this.clear = function() {
        this.map = new Map();
    }

    /* IMPLEMENTATION DETAIL */

    this.toKeyPair = function(unix) {
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
}
