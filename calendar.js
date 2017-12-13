/* DATE OBJECT EXTENSIONS */

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

// Returns the four-digit year corresponding to the ISO week of the date.
Date.prototype.getWeekYear = function() {
    var date = new Date(this.getTime());
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
}

//mode constants
let MODE_MONTH = 0;
let MODE_WEEK = 1;
let MODE_THREE_DAYS = 2;
let MODE_DAY = 3;

//first hour of day offset and px_height per hour
let PX_PER_HOUR = 88;
let FIRST_HOUR_OF_DAY = 8;

//date related constants
let MONTHS = [
    "Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"
];
let WEEKDAYS = [
    "So","Mo","Di","Mi","Do","Fr","Sa"
];
let MS_PER_DAY = 1000 * 60 * 60 * 24;

//a full calendar instance
function Calendar(container, actionCallback, filterCallback, mode, data, strip, anchor) { 
    this.container = container;
    container.classList.add("vp-calendar");

    //calendar state
    this.data = data ? data : new DateMap();      //the data backing this calendar
    this.mode = -1;                               //setMode(..) is called later in constructor, so give this an invalid mode
    this.anchor = anchor ? anchor : new Date();   //use Date.NOW as default anchor
    this.strip = strip;                           //calendar strip displaying current date

    /* GETTERS / SETTERS */

    //set current mode, if preserve == true, convert index between modes
    //if adjustPreserve is !null, add it to usedDate's current date before calculating new index
    this.setMode = function(mode, preserve, adjustPreserve) {
        //if already in mode, return
        if (mode == this.mode)
            return;

        //load template for given mode or throw
        var template;
        switch(mode) {
            case MODE_MONTH:
                template = calendarMonthTemplate();
                break;
            case MODE_WEEK:
                template = calendarWeekTemplate();
                break;
            case MODE_THREE_DAYS:
                template = calendarThreeDaysTemplate();
                break;
            case MODE_DAY:
                template = calendarDayTemplate();
                break;
            default:
                throw "Invalid Mode"
                   }

        //keep previous date range in view if preserve == true
        if (preserve) {
            //get used date for old mode at index (fix=true only has effect in MODE_MONTH)
            //only fix if date will not be adjusted
            var usedDate = this.dateForIndex(this.getIndex(), this.mode, adjustPreserve ? false : true);

            if (adjustPreserve)
                usedDate.setDate(usedDate.getDate() + adjustPreserve);

            //set corresponding index in new mode
            var newIdx = this.indexForDate(usedDate, mode);

            //noRebind=true
            this.setIndex(newIdx, true);
        }

        //update mode internally
        this.mode = mode;

        //manually call onChange(getIndex()) once, to update calendar strip to current day/mode
        this.onChange(this.getIndex());

        //set template for pager
        console.log("setTemplate");
        this.pager.setTemplate(template);
    };

    this.getMode = function() {
        return this.mode;
    }

    //this triggers rebindAll()
    this.setAnchor = function(anchor) {
        this.anchor = anchor;
        console.log("rebindAll");
        this.pager.rebindAll();
    };

    this.getAnchor = function() {
        return this.anchor;
    }

    this.getData = function() {
        return this.data;
    }

    //just delegate setIndex
    this.setIndex = function(newIndex, noRebind) {
        //if noRebind == true, set index directly instead of invoking pager.setIndex() to avoid rebinding
        if (noRebind) {
            this.pager.index = newIndex;
            return;
        }
        console.log("setIndex => " + newIndex);
        this.pager.setIndex(newIndex);
    }

    //just delegate getIndex
    this.getIndex = function() {
        return this.pager.getIndex();
    }

    //TODO: finish impl
    //delegate data insertion so shown pages can repaint
    this.addData = function(unix, data) {
        //update backing data
        this.data.setUnix(unix, data);

        //grab page added data will show on, if loaded
        var page = this.pageFromUnix(unix);

        //if page is not loaded, return
        if (!page)
            return;

        //obtain meta for panel creation
        var meta = this.metaForPanel(this.mode);

        //TODO: fix the column index (right now is 0)
        //create the panel
        var shortUnix = -1 //fix this too!! Extract intra-day unix from full day unix here
        var panel = this.panelFromValue([shortUnix, data], meta.modeStr, meta.lim, 0);

        console.log("addData => page is loaded, appending data");
    };

    //TODO: impl
    //delegate data update so shown pages can repaint
    this.changeData = function(unix, newData) {
        //update backing data -> this replaces data with same unix
        this.data.setUnix(unix, newData);

        //grab page added data will show on, if loaded
        var page = this.pageFromUnix(unix);

        //if page is not loaded, return
        if (!page)
            return;

        //TODO: update item in page here
    };

    //TODO: impl
    //delegate data removal so shown pages can repaint
    this.removeData = function(unix) {
        //delete removed item from backing data
        this.data.deleteUnix(unix);

        //grab page added data was show on, if loaded
        var page = this.pageFromUnix(unix);

        //if page is not loaded, return
        if (!page)
            return;

        //TODO: remove item from page here
    };

    /* LISTENERS */

    //when dimensions change from mobile->desktop or desktop->mobile
    window.addEventListener("dimension_changed", function(e) {

        //fix mode for current isMobile() state
        var mode = calendarFixMode(this.mode);

        //adapt mode, preserve shown date
        this.setMode(mode, true);

        //when in month mode, rebind all because content text depends on isMobile() state
        if (mode == MODE_MONTH) {
            console.log("rebindAll");
            this.pager.rebindAll();
        }
    }.bind(this));

    /* TRIGGERS */

    //call this when data changed outside of the scope of this Object
    this.notifyData = function() {
        //for now, just rebind all pages
        console.log("rebindAll");
        this.pager.rebindAll();
    }

    //just delegate pagination
    this.next = function() {
        console.log("next");
        this.pager.next();
    }

    //just delegate pagination
    this.previous = function() {
        console.log("previous");
        this.pager.previous();
    }

    /* CALLBACKS */

    //return wether or not to show items, based on their content
    this.filter = filterCallback ? filterCallback : function(value) {
        console.log("filter => " + value);
        return true;
    };

    //return wether a click was consumed or not (action outside of calendar was taken)
    this.action = actionCallback ? actionCallback : function(e, mode) {
        console.log("action => " + e.target.className + ":" + mode);
        return false;   //don't consume click event
    };

    /* IMPLEMENTATION DETAIL */

    //get page that contains unix date, or null if not loaded
    this.pageFromUnix = function(unix) {
        //create date from unix
        var date = new Date(unix * 1000);

        //get index for date
        var idx = this.indexForDate(date, this.mode);

        //return page if loaded, otherwise return null
        return this.pager.getPage(idx);
    }

    //bind data to a week-, 3-day or day-page
    this.onBindWeekOrDays = function(page, index) {
        var date = this.dateForIndex(index, this.mode);

        //var grab Date.NOW
        var now = new Date();

        //grab headers
        var headers = page.firstElementChild;

        //grab content
        var content = page.lastElementChild.lastElementChild;

        //clear content
        content.innerHTML = "";

        //TODO: switch instead of if
        //loop through week
        var meta = this.metaForPanel(this.mode);
        for (var c = 0; c < meta.lim; c++) {
            var pDate = date.getDate();

            //refresh current day of week's header
            var header = headers.children[c];
            header.innerText = WEEKDAYS[date.getDay()] + ", " + pDate;

            //if NOW, mark it blue
            if (areDatesEqual(date, now))
                header.classList.add("calendar-now")
            else
                header.classList.remove("calendar-now");

            //load content for current day
            var pData = this.data.getUnixAll(this.toUnix(date));

            //if data exists, append it
            if (pData) {
                header.innerText = header.innerText + "[...]";    //indicate there is data

                var it = pData.entries();
                var next = it.next();
                while(!next.done) {
                    var val = next.value;
                    if (this.filter(val))
                        content.appendChild(this.panelFromValue(val, meta.modeStr, meta.lim, c));

                    /*LOGICAL BLOCK START

                    var meta = val[1];
                    var time = this.fromShortUnix(val[0]) + " - " + this.fromShortUnix(val[0] + meta[2]);

                    var color = meta[0];
                    var text = meta[1];
                    var duration = meta[2];

                    //create panel
                    var panel = calendarCreatePanel("calendar-panel-" + modeStr + " card",
                                                    time,
                                                    color,
                                                    text);

                    //position panel
                    var unix = val[0];
                    var off = this.unixToOffset(unix);
                    panel.style.top = off.px + "px";
                    var over = off.backward ? -1 : 0;
                    panel.style.left = "calc(100% / " + lim + " * " + (c+over) + ")";
                    panel.style.height = this.unixToPx(duration) + "px";

                    content.appendChild(panel);

                    //LOGICAL BLOCK END */                    

                    next = it.next();
                }
            }

            //increment date
            date.setDate(pDate + 1);
        }
    }

    //get lim and modeStr used in panel creation for mode
    this.metaForPanel = function(mode) {
        var lim, modeStr;
        if (this.mode == MODE_WEEK) {
            lim = 7;
            modeStr = "week";
        } else if (this.mode == MODE_THREE_DAYS) {
            lim = 3;
            modeStr = "3-days";
        } else if (this.mode == MODE_DAY) {
            lim = 1;
            modeStr = "day";
        }

        return {lim: lim, modeStr: modeStr};
    }

    //create a panel for week, 3-day, day modes
    //params: value=[unix, data] modeStr=class suffix for mode, lim=column count for mode, c=current column
    this.panelFromValue = function(val, modeStr, lim, c) {
        var meta = val[1];
        var time = this.fromShortUnix(val[0]) + " - " + this.fromShortUnix(val[0] + meta[2]);

        var color = meta[0];
        var text = meta[1];
        var duration = meta[2];

        //create panel
        var panel = calendarCreatePanel("calendar-panel-" + modeStr + " card",
                                        time,
                                        color,
                                        text);

        //position panel
        var unix = val[0];
        var off = this.unixToOffset(unix);
        panel.style.top = off.px + "px";
        var over = off.backward ? -1 : 0;
        panel.style.left = "calc(100% / " + lim + " * " + (c+over) + ")";
        panel.style.height = this.unixToPx(duration) + "px";

        //return the new panel
        return panel;
    }

    //bind data to a month page
    this.onBindMonth = function(page, index) {
        //get first date for page
        var date = this.dateForIndex(index, this.mode);
        var displayDate = this.displayDate(date);

        //grab Date.NOW
        var now = new Date();

        //grab page content
        var content = page.lastElementChild;

        //loop through month panels to set their respective data
        var panel = content.firstElementChild;
        while (panel) {
            var pDate = date.getDate();

            if (areDatesEqual(date, now))
                panel.classList.add("calendar-now");
            else
                panel.classList.remove("calendar-now");

            //grab the section
            var section = panel.firstElementChild;

            //grab strips
            var strip = section.lastElementChild;

            //clear strips
            strip.innerHTML = "";

            //get panel content
            var pContent = panel.lastElementChild;

            //clear panel content
            pContent.innerText = "";

            //grab data for full day
            var pData = this.data.getUnixAll(this.toUnix(date));

            //if data for day, apply it
            if (pData) {
                //size holder
                var size = 0;

                //prepare to store colors
                var colors = [];

                //get entries iterator for pData
                var it = pData.entries();

                //iterate pData to grab colors
                var next = it.next();
                while(!next.done) {
                    //only count/use item if filter returns true
                    if (this.filter(next.value)) {
                        var color = next.value[1][0];

                        if (!colors.includes(color)) {
                            colors.push(color);

                            var point = newDiv("calendar-point");
                            point.style.background = color;

                            strip.appendChild(point);
                        }

                        size++;
                    }
                    next = it.next();
                } 

                //set panel content (Termine-count) depending on isMobile()
                if (size > 0)
                    pContent.innerText = isMobile() ? "" : (size + " Termin" + (size > 1 ? "e" : ""));
            }

            //set date of month on panel
            var pEle = section.firstElementChild;
            pEle.innerText = pDate + ".";

            //apply disabled class if not displayMonth
            if (date.getMonth() == displayDate[0])
                panel.classList.remove("calendar-disabled");
            else
                panel.classList.add("calendar-disabled");

            //grab next date and panel
            date.setDate(pDate + 1);
            panel = panel.nextElementSibling;
        }

    };

    //convert unix to offset in WEEK / 3-DAY / DAY page
    this.unixToOffset = function(unix) {
        var px = this.unixToPx(unix);

        //apply first hour of day offset
        px -= PX_PER_HOUR * FIRST_HOUR_OF_DAY;            

        return {px: px < 0 ? px + PX_PER_HOUR * 24 : px, backward: px < 0};
    }

    //convert unix to px
    this.unixToPx = function(unix) {
        return 88 * unix / 3600 ;
    }

    //convert a date to unix timestamp
    this.toUnix = function(date) {
        return Math.floor(date.getTime() / 1000);
    }

    //convert a short unix timestamp to hours:minutes string
    this.fromShortUnix = function(unix) {
        var hours = Math.floor(unix / 3600);
        var minutes = Math.floor((unix - hours * 3600) / 60);

        return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
    }

    //display the correct month, year when in month mode
    this.displayDate = function(date) {
        //adjust current display month, year
        var month = date.getMonth() + (date.getDate() == 1 ? 0 : 1);
        var year = date.getFullYear();

        //fix overflow
        year += month > 11 ? 1 : 0;
        month = month > 11 ? 0 : month;

        //return month, year
        return [month, year];
    }

    //get first date for index in passed mode
    this.dateForIndex = function(index, mode, fix) {
        //copy anchor date
        var date = new Date(this.anchor);

        //adjust date based on mode
        switch(mode) {
            case MODE_MONTH:
                date.setMonth(date.getMonth() + index);
                date.setDate(1);
                if (date.getDay() != 0)
                    date.setDate(date.getDate() - date.getDay() + 1);

                //dirty fix -> maybe fix the fix? :D
                if (fix && date.getDate() > 7)
                    date.setDate(date.getDate() + 7);
                break;
            case MODE_WEEK:
                date.setDate(date.getDate() + index * 7);
                date.setDate(date.getDate() - date.getDay() + 1);
                break;
            case MODE_THREE_DAYS:
                date.setDate(date.getDate() + index * 3);
                break;
            case MODE_DAY:
                date.setDate(date.getDate() + index);
                break;
            default:
                throw "Invalid Mode";
                   }

        //return date
        return date;
    }

    //get index for a date in passed mode
    this.indexForDate = function(date, mode) {
        //get anchor date for passed mode (fix=true, has no effect other than in month mode)
        var anchorInMode = this.dateForIndex(0, mode, true);

        //find the index for passed mode
        var idx;
        if (mode == MODE_MONTH) {
            //just the diff in years * 12 + diff in months
            var diffY = date.getFullYear() - anchorInMode.getFullYear();
            var diffM = date.getMonth() - anchorInMode.getMonth();

            idx = (diffY * 12) + diffM;
        } else {
            //get diff in days
            var diffD = dateDiffInDays(date, anchorInMode);

            if (mode == MODE_WEEK)  //divide by 7 (week has 7 days)
                idx = Math.floor(diffD / 7);
            else if (mode == MODE_THREE_DAYS)   //divide by 3 (mode always shows 3 days)
                idx = Math.floor(diffD / 3);
            else if (mode == MODE_DAY)  //just take raw diffD because index == diffD anyway
                idx = diffD;
        }

        return idx;
    }

    //traverse up the DOM till element with passed class found or no higher parent
    this.findTraverseUp = function(target, clazz) {
        while(target && !target.classList.contains(clazz)) {
            target = target.parentElement;
        }

        return target;
    }

    /* VIEWPAGER CALLBACKS */

    //bind content for a full page
    this.onBind = function(page, index) {
        switch (this.mode) {
            case MODE_MONTH:
                this.onBindMonth(page, index);
                break;
            case MODE_WEEK:
            case MODE_THREE_DAYS:
            case MODE_DAY:
                this.onBindWeekOrDays(page, index);
                break;
            default:
                throw "Invalid Mode";
                         } 

        console.log("onBind => " + index);
    }.bind(this);

    //update strip if index changes
    this.onChange = function(newIndex) {
        //if no strip, return
        if (!this.strip)
            return;

        //grab date
        var date = this.dateForIndex(this.pager.getIndex(), this.mode);

        //the dateStr to display based on mode
        var dateStr;
        switch (this.mode) {
            case MODE_MONTH:
                var displayDate = this.displayDate(date);
                dateStr = MONTHS[displayDate[0]] + " " + displayDate[1];
                break;
            case MODE_WEEK:
                dateStr = "KW " + date.getWeek() + " (" + MONTHS[date.getMonth()].substr(0,3) + ") " + date.getWeekYear();
                break;
            case MODE_THREE_DAYS:
                var fYear = date.getFullYear();
                dateStr = date.getDate() + "." + (date.getMonth() + 1) + ". - ";
                date.setDate(date.getDate() + 2);
                dateStr += date.getDate() + "." + (date.getMonth() + 1) + "." + fYear;
                break;
            case MODE_DAY:
                dateStr = date.getDate() + ". " + MONTHS[date.getMonth()].substr(0,3) + " " + date.getFullYear();
                break;
            default:
                throw "Invalid Mode";
                         }

        //set strip text
        this.strip.innerText = dateStr;
    }.bind(this);

    //attach metadata to template clones
    this.onCreate = function(page) {
        switch (this.mode) {
            case MODE_MONTH:
                calendarOnCreateMonth(page);
                break;
            case MODE_WEEK:
            case MODE_THREE_DAYS:
                calendarOnCreateWeekOr3Days(page);
                break;
            case MODE_DAY:
                //nothing to do here, at least for now
                break;
            default:
                throw "Invalid Mode";
                         }
    }.bind(this);

    //navigate through calendar, or invoke actions
    this.onClick = function(e) {
        //check if action callback consumed the click event
        if (this.action(e, this.mode))
            return;

        //default navigation

        //when clicked on month, go to week / 3-days
        if (this.mode == MODE_MONTH) {
            var newMode = calendarFixMode(MODE_WEEK);

            var target = this.findTraverseUp(e.target, "calendar-panel-month");
            if (target) {
                //get the month panel's id
                var panelId = target.panelId;

                //use panel id as adjustPreserve
                this.setMode(newMode, true, panelId);
            }
        }

        //when clicked on header in week / 3-days, go to day
        if (this.mode == MODE_WEEK || this.mode == MODE_THREE_DAYS) {
            //obtain click target
            var target = this.findTraverseUp(e.target, "calendar-header-week");
            if (!target)
                target = this.findTraverseUp(e.target, "calendar-header-3-days");
            if (target) {
                //get the header's id
                var headerId = target.headerId;
                
                //use header id as adjustPreserve, preserve=true to notify adjustPreserve might be set
                this.setMode(MODE_DAY, true, headerId);
                console.log(e.target.className);
            }
        }
    }.bind(this);

    //sync scroll state in WEEK_MODE, THREE_DAYS_MODE or DAY_MODE
    this.onBeforeChange = function(oldIndex) {
        //no need to sync scroll in month mode, so return
        if (this.mode == MODE_MONTH)
            return;

        //get content scroll state
        var pages = this.pager.getPages();
        var scrollTop = pages[0].lastElementChild.scrollTop;

        //sync content scroll state
        pages[-1].lastElementChild.scrollTop = scrollTop;
        pages[1].lastElementChild.scrollTop = scrollTop;
    }.bind(this); 

    /* VIEWPAGER LINK */

    //create viewpager for this calendar
    this.pager = new ViewPager(container,
                               [-Infinity, Infinity],
                               this.onBind,
                               this.onChange,
                               this.onCreate,
                               this.onClick,
                               this.onBeforeChange);


    //fix mode for current isMobile() state
    mode = calendarFixMode(mode);

    //kick of template creation and, subsequently, binding
    this.setMode(mode ? mode : MODE_MONTH);
}

//fix mode depending on isMobile()
function calendarFixMode(mode) {
    if (isMobile() && mode == MODE_WEEK)
        mode = MODE_THREE_DAYS;
    else if (!isMobile() && mode == MODE_THREE_DAYS)
        mode = MODE_WEEK;

    return mode;
}

function calendarMonthTemplate() {
    //the container
    var template = newDiv("");

    //the headers
    var headers = newDiv("calendar-headers");
    for (var c = 0; c < 7; c++) {
        var header = newDiv("calendar-header-month");
        header.innerText = WEEKDAYS[c+1 > 6 ? 0 : c+1];

        headers.appendChild(header);
    }

    //the content, fill with panels
    var content = newDiv("calendar-content-month");
    for (var c = 0; c < 42; c++) {
        content.appendChild(calendarCreatePanel("calendar-panel-month"));
    }

    //append to container
    template.appendChild(headers);
    template.appendChild(content);

    //return container
    return template;
}

//create panel with given className [optional: time, color, text]
function calendarCreatePanel(className, time, color, text) {
    var panel = newDiv(className);        

    var section = newDiv("fill");

    var timeEle = newDiv("calendar-panel-date");
    if (time)
        timeEle.innerText = time;
    if (color) {
        timeEle.style.color = color;
        panel.style.borderTop = "2px solid " + color;
    }

    var textEle = newDiv("calendar-panel-inner");
    if (text)
        textEle.innerText = text;


    section.appendChild(timeEle);

    //if in MODE_MONTH, append strip to display .point items
    if (!color) {
        var strips = newDiv("calendar-panel-strip");
        section.appendChild(strips);
    }
    panel.appendChild(section);

    panel.appendChild(textEle);

    return panel;
}

function calendarOnCreateMonth(page) {
    //get content element
    var content = page.lastElementChild;

    //loop through its children and attach panelId
    var c = 0;
    var child = content.firstElementChild;
    while (child) {
        child.panelId = c++;
        child = child.nextElementSibling;
    }
}

function calendarOnCreateWeekOr3Days(page) {
    //get headers element
    var headers = page.firstElementChild;
    
    //loop through its children and attach headerId
    var c = 0;
    var child = headers.firstElementChild;
    while (child) {
        child.headerId = c++;
        child = child.nextElementSibling;
    }
}

function calendarWeekTemplate() {
    var template = newDiv("");

    //the headers
    var headers = newDiv("calendar-headers");
    for (var c = 0; c < 7; c++) {
        var header = newDiv("calendar-header-week");

        headers.appendChild(header);
    }

    //the content wrapper
    var wrapper = newDiv("calendar-content-week-or-days-wrapper");

    //the content
    var content = newDiv("calendar-content-week");

    //the columns (only for borders)
    for (var c = 0; c < 7; c++)
        content.appendChild(newDiv("calendar-column-week"));

    //append the ToD strips
    calendarTimeOfDayStrips(content);

    //append to wrapper
    wrapper.appendChild(content);

    //inner content holds items, so that TimeOfDay strips don't get cleared
    var contentInner = newDiv("calendar-content-week");
    wrapper.appendChild(contentInner);

    //append to container
    template.appendChild(headers);
    template.appendChild(wrapper);

    //return container
    return template;
}

function calendarThreeDaysTemplate() {
    var template = newDiv("");

    //the headers
    var headers = newDiv("calendar-headers");
    for (var c = 0; c < 3; c++) {
        var header = newDiv("calendar-header-3-days");
        header.innerText = "H" + c;

        headers.appendChild(header);
    }

    //the content wrapper
    var wrapper = newDiv("calendar-content-week-or-days-wrapper");

    //the content
    var content = newDiv("calendar-content-3-days");

    //the columns (only for borders)
    for (var c = 0; c < 3; c++)
        content.appendChild(newDiv("calendar-column-3-days"));

    //append the ToD strips
    calendarTimeOfDayStrips(content);

    //append to wrapper
    wrapper.appendChild(content);

    //actual content holder
    var innerContent = newDiv("calendar-content-3-days");
    wrapper.appendChild(innerContent);

    //append to container
    template.appendChild(headers);
    template.appendChild(wrapper);

    //return container
    return template;
}

function calendarDayTemplate() {
    var template = newDiv("");

    //the headers
    var headers = newDiv("calendar-headers");

    //the sole header
    var header = newDiv("calendar-header-day");
    header.innerText = "Header";

    headers.appendChild(header);

    //the content wrapper
    var wrapper = newDiv("calendar-content-week-or-days-wrapper");

    //the content
    var content = newDiv("calendar-content-day");

    //append the ToD strips
    calendarTimeOfDayStrips(content);

    //append to wrapper
    wrapper.appendChild(content);

    var innerContent = newDiv("calendar-content-day");
    wrapper.appendChild(innerContent);

    //append to container
    template.appendChild(headers);
    template.appendChild(wrapper);

    //return container
    return template;
}

function calendarTimeOfDayStrips(content) {
    //time of day strips to the left of content
    for (var c = 0; c < 24; c++) {
        //create ToD element
        var timeOfDay = newDiv("calendar-time-of-day");

        //position element
        timeOfDay.style.top = (c * PX_PER_HOUR) + "px";

        //set its content
        timeOfDay.innerText = calendarAsHours(c, FIRST_HOUR_OF_DAY);

        content.appendChild(timeOfDay);
    }
}

//returns c as hour with off as offset [overflow rolls around]
function calendarAsHours(c, off) {
    c += off;
    c = c > 23 ? c - 24 : c;

    return (c < 10 ? "0" : "") + c + ":00";
}

/* CALENDAR FIREBASE - DEBUG ONLY */

//get public.tasks ref handle
var genericListener = database.ref('/tasks');

//TODO: specific event listeners 'add','change','remove'
genericListener.on('value', parseTasks, parseTasksError);

function parseTasks(snapshot) { 
    //grab calendar data and clear
    var _calendarData = calendar.getData();
    _calendarData.clear();

    //load new items
    snapshot.forEach(function(child) {
        var childKey = child.key;
        var childData = child.val();                   

        _calendarData.setUnix(childKey, childData);
    });

    //repaint pages
    calendar.notifyData();
}

function parseTasksError(error) {
    var errorCode = error.code;
    var errorMessage = error.message;

    console.log("fetch error => " + errorCode + ":" + errorMessage);
}