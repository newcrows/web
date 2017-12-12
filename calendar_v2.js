let MODE_MONTH = 0;
let MODE_WEEK = 1;
let MODE_THREE_DAYS = 2;
let MODE_DAY = 3;

function Calendar(container) {
    this.mode = 0;
    
    this.pager = new ViewPager(container,
                               [-Infinity, Infinity]);
}