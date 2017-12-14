/* DATE OBJECT EXTENSIONS */

//constants
let MONTHS = [
    "Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"
];
let WEEKDAYS = [
    "So","Mo","Di","Mi","Do","Fr","Sa"
];
let MS_PER_DAY = 1000 * 60 * 60 * 24;
let SUNDAY = 0;

//returns is leap-year
Date.prototype.isLeapYear = function() {
    var year = this.getFullYear();
    if((year & 3) != 0) return false;
    return ((year % 100) != 0 || (year % 400) == 0);
};

//returns day of year
Date.prototype.getDayOfYear = function() {
    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var mn = this.getMonth();
    var dn = this.getDate();
    var dayOfYear = dayCount[mn] + dn;
    if(mn > 1 && this.isLeapYear()) dayOfYear++;
    return dayOfYear;
};

//returns KW of the date
Date.prototype.getWeek = function() {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                           - 3 + (week1.getDay() + 6) % 7) / 7);
}

//returns the four-digit year corresponding to the ISO week of the date.
Date.prototype.getWeekYear = function() {
    var date = new Date(this.getTime());
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
}

//return if this date is equal to another date, ignoring time of day
Date.prototype.isEqual = function(otherDate) {
    return this.getFullYear() == otherDate.getFullYear() &&
        this.getMonth() == otherDate.getMonth() &&
        this.getDate() == otherDate.getDate();
}

//returns difference in days between this date and another date, ignoring time of day
Date.prototype.daysTo = function(otherDate) {
    //use UTC time format to discard timezone data like day-savings
    var thisUTC = Date.UTC(this.getFullYear(), this.getMonth(), this.getDate());
    var otherUTC = Date.UTC(otherDate.getFullYear(), otherDate.getMonth(), otherDate.getDate());
    
    return Math.floor((otherUTC - thisUTC) / MS_PER_DAY);
}

//returns difference in weeks between this date and another date
Date.prototype.weeksTo = function(otherDate) {
    var days = this.mondayOfWeek().daysTo(otherDate.mondayOfWeek());
    
    return days / 7;
}

//returns the monday of this date's current week, as new date
Date.prototype.mondayOfWeek = function() {
    //the date that will hold monday of this date's current week
    var date = new Date(this);
    
    var day = date.getDay();
    if (day == SUNDAY)
        day = 7;
    date.setDate(date.getDate()-day+1);
    
    return date;
}

//returns the first monday before this month, as new date, ignoring time of day
Date.prototype.mondayBeforeMonth = function() {
    //date that will hold first monday before this date
    var date = new Date(this);
    date.setDate(1);
    
    var day = date.getDay();
    if (day == SUNDAY)
        day = 7;
    date.setDate(-day+2);   //+2 because: date=1, SUNDAY=0 -> MONDAY=1 meaning date+MONDAY = 1+1 = 2
    
    return date;
}

//returns the month following monday before, as Number, [or month monday is in, when mondayBefore == firstDayOfMonth]
Date.prototype.displayMonth = function() {
    var before = this.mondayBeforeMonth();
    var month = before.getMonth();
    
    if (before.getDate() > 7)
        month++;
    
    if (month > 11)
        month -= 12;
    
    return month;
}

Date.prototype.toUnix = function() {
    return Math.floor(this.getTime() / 1000);
}

/* DATE SPECIFIC STORAGE */

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

        //return the day key as unix too, for easy reference (hh, mm, ss = 0)
        //i.E. [one of the items].key + key => full unix for item
        return {key: keys.main, value: this.map.get(keys.main)};
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
    
    /* FUNCTIONS */

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
