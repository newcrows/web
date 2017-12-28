//required constants
let MONTHS = [
    "Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"
];
let WEEKDAYS = [
    "So","Mo","Di","Mi","Do","Fr","Sa"
];
let MS_PER_DAY = 1000 * 60 * 60 * 24;
let SUNDAY = 0;

//Extended Date object
function ExDate(a, b, c, d, e, f, g) {
    //create a new vanilla Date object by reflecting argument list
    var x = new (Function.prototype.bind.apply(Date, [Date].concat(Array.prototype.slice.call(arguments))));

    //inject extended prototype
    x.__proto__ = ExDate.prototype;

    //return new ExDate
    return x;
}

//patch ExDate's prototype chain
ExDate.prototype.__proto__ = Date.prototype;

//ExDate extended functions
ExDate.prototype.isLeapYear = function() {
    var year = this.getFullYear();
    if((year & 3) != 0) return false;
    return ((year % 100) != 0 || (year % 400) == 0);
};

ExDate.prototype.getDayOfYear = function() {
    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var mn = this.getMonth();
    var dn = this.getDate();
    var dayOfYear = dayCount[mn] + dn;
    if(mn > 1 && this.isLeapYear()) dayOfYear++;
    return dayOfYear;
};

ExDate.prototype.getWeek = function() {
    var date = new ExDate(this.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new ExDate(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                           - 3 + (week1.getDay() + 6) % 7) / 7);
}

ExDate.prototype.getWeekYear = function() {
    var date = new ExDate(this.getTime());
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
}

ExDate.prototype.isEqualDate = function(otherDate) {
    return this.getFullYear() == otherDate.getFullYear() &&
        this.getMonth() == otherDate.getMonth() &&
        this.getDate() == otherDate.getDate();
}

ExDate.prototype.daysTo = function(otherDate) {
    //use UTC time format to discard timezone data like day-savings
    var thisUTC = Date.UTC(this.getFullYear(), this.getMonth(), this.getDate());
    var otherUTC = Date.UTC(otherDate.getFullYear(), otherDate.getMonth(), otherDate.getDate());

    return Math.floor((otherUTC - thisUTC) / MS_PER_DAY);
}

ExDate.prototype.weeksTo = function(otherDate) {
    var days = this.mondayOfWeek().daysTo(otherDate.mondayOfWeek());

    return days / 7;
}

ExDate.prototype.monthsTo = function(otherDate) {
    var years = otherDate.getFullYear() - this.getFullYear();
    var months = otherDate.getMonth() - this.getMonth();

    return (years * 12) + months;
}

ExDate.prototype.mondayOfWeek = function() {
    //the date that will hold monday of this date's current week
    var date = new ExDate(this);

    var day = date.getDay();
    if (day == SUNDAY)
        day = 7;
    date.setDate(date.getDate()-day+1);

    return date;
}

ExDate.prototype.mondayBeforeMonth = function() {
    //date that will hold first monday before this date
    var date = new ExDate(this);
    date.setDate(1);

    var day = date.getDay();
    if (day == SUNDAY)
        day = 7;
    date.setDate(-day+2);   //+2 because: date=1, SUNDAY=0 -> MONDAY=1 meaning date+MONDAY = 1+1 = 2

    return date;
}

ExDate.prototype.displayMonth = function() {
    var month = this.getMonth();

    if (this.getDate() > 7)
        month++;

    if (month > 11)
        month -= 12;

    return month;
}

ExDate.prototype.displayYear = function() {
    var month = this.getMonth();
    if (this.displayMonth() < month)
        return this.getFullYear() + 1;

    return this.getFullYear();
}

ExDate.prototype.toUnix = function() {
    return Math.floor(this.getTime() / 1000);
}

ExDate.prototype.toShortUnix = function() {
    var hours = this.getHours();
    var minutes = this.getMinutes();

    return hours * 3600 + minutes * 60;
}

ExDate.prototype.asString = function() {
    return this.getDate() + ". " + MONTHS[this.getMonth()] + " " + this.getFullYear();
}

ExDate.prototype.asHHMMString = function() {
    var hours = this.getHours();
    var minutes = this.getMinutes();

    return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
}

ExDate.prototype.increment = function() {
    this.setDate(this.getDate() + 1);
}

ExDate.prototype.addDays = function(days) {
    this.setDate(this.getDate() + days);
}

ExDate.prototype.addMonths = function(months) {
    this.setMonth(this.getMonth() + months);
}

//ExDate static functions
ExDate.HHMMStringFromShortUnix = function(unix) {
    var hours = Math.floor(unix / 3600);
    var minutes = Math.floor((unix - (hours * 3600)) / 60);

    return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
}

ExDate.HHMMStringFromUnix = function(unix) {
    return ExDate.HHMMStringFromShortUnix(ExDate.toShortUnix(unix));
}

ExDate.fromUnix = function(unix) {
    return new ExDate(unix * 1000);
}

ExDate.unixToShortUnix = function(unix) {
    return ExDate.fromUnix(unix).toShortUnix();
}
