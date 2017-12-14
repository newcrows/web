let MODES = {
    MONTH: 0,
    WEEK: 1,    //will auto-adapt to three days when on mobile
    DAY: 2
}

let PX_PER_HOUR = 88;
let FIRST_HOUR_OF_DAY = 8;

function Calendar(container, strip, onModeChangeCallback, onFilterCallback, onActionCallback) {
    //variables
    this.container = container; //the container used as calendar
    this.strip = strip;         //the strip displaying calendars currently shown date, if any
    this.data = new DateMap();  //the data that populates this calendar
    this.now = new Date(2017,11,14,10);      //the date calendar recognizes as "now" (date when index = 0)
    this.mode = -1;
    this.pager = new ViewPager(container);  //bounds null, callbacks null

    /* MOCK DATA FOR TESTING */
    this.data.setUnix(this.now.toUnix(), ["coral","(90 Min) Theorie Thema 5",5400]);
    this.data.setUnix(this.now.toUnix() + 3600 * 2, ["cornflowerblue","(45 Min) Fahren",2700]);
    this.data.setUnix(this.now.toUnix() + 3600 * 3, ["#4CAF50","(90 Min) Fahren Autobahn",5400]);
    this.data.setUnix(this.now.toUnix() + 3600 * 24, ["gray","Buchbar",2700]);

    /* GETTERS / SETTERS */
    this.setMode = function(mode) {
        //already in target mode, return
        if (this.mode == mode)
            return;

        //update mode
        this.mode = mode;

        //notify callback BEFORE actually performing mode-switch, to give callbacks time to update
        this.onModeChange(mode);

        //set callbacks for mode
        this.setCallbacks(mode);

        //set template based on mode -> this rebinds all pages
        this.setTemplates(mode);

        //invoke pager.onChange to stay in sync [strip updates, etc]
        this.pager.onChange(this.getIndex());
    }

    this.getMode = function() {
        return this.mode;
    }

    /* CALLBACKS */

    this.onModeChange = onModeChangeCallback ? onModeChangeCallback : noop;

    this.onFilter = onFilterCallback ? onFilterCallback : noop;

    this.onAction = onActionCallback ? onActionCallback : noop;

    /* LISTENERS */

    //listen for dimension changes
    addEventListener("dimension_changed", function() {
        //just reload pager when dimensions change
        var mode = this.getMode();

        //if mode is MODE.WEEK, recalculate index between WEEK and 3-days
        if (mode == MODES.WEEK) {
            //get index
            var index = this.getIndex();

            //get date for index BEFORE dimensions changed
            var date = isMobile() ? this.weekForIndex(index) : this.threeDaysForIndex(index);

            //get index for date AFTER dimensions changed
            index = isMobile() ? this.indexForThreeDays(date, true) : this.indexForWeek(date);

            //apply new index without rebinding
            this.setIndex(index, true);

            //invoke pager.onChange to stay in sync [strip changes between week/3-days]
            this.pager.onChange(this.getIndex());
        }

        this.setTemplates(mode); 
    }.bind(this));

    /* PAGER CALLBACKS FOR MODE = MONTH */
    this.onBindMonth = function(page, index) {
        //get date representing month to bind, depending on Calendar.now
        //TODO: also make it depend on isMobile() -> 3-days when in mobile
        var date = this.monthForIndex(index);

        //grab display month, to gray out panels on bounding months
        var month = date.displayMonth();

        //normalize date to first monday before month
        date = date.mondayBeforeMonth();

        var content = page.lastElementChild;
        var panel = content.firstElementChild;
        while(panel) {            
            //disable panel when not in display month
            if (date.getMonth() == month)
                panel.classList.remove("calendar-disabled");
            else
                panel.classList.add("calendar-disabled");

            //mark panel with .calendar-now when date of panel == Date.NOW
            if (this.now.isEqual(date))
                panel.classList.add("calendar-now");
            else
                panel.classList.remove("calendar-now");

            //grab section
            var section = panel.firstElementChild;

            //set date holder element
            section.firstElementChild.innerText = date.getDate() + ".";

            //get data for day, if any
            var data = this.data.getUnixAll(date.toUnix()).value;

            //set strips depending on items for date, returns count of items
            var count = this.stripsForMonth(section.lastElementChild, data);

            //set panel content, depending on count
            this.contentForMonth(panel.lastElementChild, count);

            //increment date by one
            date.setDate(date.getDate() + 1);

            //grab next panel
            panel = panel.nextElementSibling;
        }
    }

    this.onChangeMonth = function(index) {
        if (!strip)
            return;

        var date = this.monthForIndex(index);
        var month = date.displayMonth();

        strip.innerText = MONTHS[month] + " " + date.getFullYear();
    }

    this.onCreateMonth = function(page) {
        var content = page.lastElementChild;

        //give the panels a panelId to identify them by
        var panel = content.firstElementChild;
        var id = 0;
        while(panel) {
            panel.panelId = id++;
            panel = panel.nextElementSibling;
        }
    }

    this.onClickMonth = function(e) {
        var target = findTraverseUp(e.target, "calendar-panel-month");
        if (!target || this.onAction(target))
            return;

        //get month for index as date
        var date = this.monthForIndex(this.getIndex());

        //find first monday currently shown
        date = date.mondayBeforeMonth();

        //adjust date to match clicked panel
        date.setDate(date.getDate() + target.panelId);

        //get new index -> distance from Date.NOW to clicked date in weeks / 3-days
        var newIndex = isMobile() ? this.indexForThreeDays(date) : this.indexForWeek(date);
        
        //set new index, without rebinding pages
        this.setIndex(newIndex, true);

        //change mode to WEEK -> this rebindsAll pages at new mode:index
        this.setMode(MODES.WEEK);
    }

    /* PAGER CALLBACKS FOR MODE = WEEK */
    this.onBindWeek = function(page, index) {
        //get date representing week
        var date = isMobile() ? this.threeDaysForIndex(index) : this.weekForIndex(index);

        //grab headers
        var headers = page.firstElementChild;

        //get wrapper containing content[time of day strips, column vertical lines], content
        var wrapper = page.lastElementChild;

        //grab content
        var content = wrapper.lastElementChild;

        //clear content
        content.innerText = "";

        //grab columnCount, depending on isMobile()
        var columnCount = isMobile() ? 3 : 7

        //loop through columns
        for (var column = 0; column < columnCount; column++) {            
            //get data for current day
            var data = this.data.getUnixAll(date.toUnix());

            //append data to content at column
            this.panelsForWeek(content, data, column);

            //set header for current column, show [...] if data exists for this column
            this.headerForWeek(headers.children[column], date, data.value);

            //increment date by one day
            date.setDate(date.getDate() + 1);
        }
    }

    this.onChangeWeek = function(index) {
        if (!this.strip)
            return;

        var date = isMobile() ? this.threeDaysForIndex(index) : this.weekForIndex(index);

        var text;
        if (isMobile()) {
            var threeDayStart = date.getDate() + "." + (date.getMonth()+1) + ". - ";
            var fullYear = date.getFullYear();
            date.setDate(date.getDate() + 2);
            var threeDayEnd = date.getDate() + "." + (date.getMonth()+1) + "." + fullYear; 

            text = threeDayStart + threeDayEnd;
        } else {
            text = "KW" + date.getWeek() + " (" + MONTHS[date.getMonth()].substr(0,3) + ") " + date.getWeekYear();
        }

        this.strip.innerText = text;
    }

    this.onCreateWeek = function(page) {
        var headers = page.firstElementChild;

        //give the headers ids to identify them by
        var header = headers.firstElementChild;
        var id = 0;
        while(header) {
            header.headerId = id++;
            header = header.nextElementSibling;
        }
    }

    this.onClickWeek = function(e) {
        var target = findTraverseUp(e.target, "calendar-panel-week");
        if (!target) {
            target = findTraverseUp(e.target, "calendar-header-week");
            if (!target)
                return;

            if (this.onAction(target))
                return;
            
            //handle header clicks here
            console.log("onClickWeek => " + target.headerId);
        } else if (!this.onAction(target)) {
            
            //handle item clicks here
            console.log("onClickWeek => " + target.panelId);
        }
    }

    /* PAGER TRIGGER DELEGATES */
    this.notifyBind = function(index) {
        this.pager.notifyBind();
    }

    this.next = function() {
        this.pager.next();
    }

    this.previous = function() {
        this.pager.previous();
    }

    this.rebindAll = function() {
        this.pager.rebindAll();
    }

    /* PAGER GETTER / SETTER DELEGATES */
    this.setBounds = function(bounds) {
        this.pager.setBounds(bounds);
    }

    this.getBounds = function() {
        return this.pager.getBounds();
    }

    this.setIndex = function(index, direct) {
        //if direct == true, circumvent page rebinding that would occur if pager.setIndex(..) was called
        if (direct)
            this.pager.index = index;
        else
            this.pager.setIndex(index);
    }

    this.getIndex = function() {
        return this.pager.getIndex();
    }

    this.getPages = function() {
        return this.pager.getPages();
    }

    this.getPageIfLoaded = function(index) {
        return this.pager.getPageIfLoaded(index);
    }

    this.setTemplate = function(template) {
        this.pager.setTemplate(template);
    }

    this.getTemplate = function() {
        return this.pager.getTemplate();
    }

    /* IMPLEMENTATION DETAIL */
    this.setCallbacks = function(mode) {
        switch(mode) {
            case MODES.MONTH:
                this.pager.onBind = this.onBindMonth.bind(this);
                this.pager.onChange = this.onChangeMonth.bind(this);
                this.pager.onCreate = this.onCreateMonth.bind(this);
                this.pager.onClick = this.onClickMonth.bind(this);
                return;
            case MODES.WEEK:
                this.pager.onBind = this.onBindWeek.bind(this);
                this.pager.onChange = this.onChangeWeek.bind(this);
                this.pager.onCreate = this.onCreateWeek.bind(this);
                this.pager.onClick = this.onClickWeek.bind(this);
                return;
            default:
                throw "Invalid Mode => " + mode;
                   }
    }

    this.setTemplates = function(mode) {
        switch(mode) {
            case MODES.MONTH:
                this.setTemplate(calMonthTemplate());
                break;
            case MODES.WEEK:
                this.setTemplate(calWeekTemplate());
                break;
            default:
                throw "Invalid Mode => " + mode;
                   }
    }

    //returns date holding month for passed index
    this.monthForIndex = function(index) {        
        //date that will hold month for index
        var date = new Date(this.now);
        date.setMonth(date.getMonth() + index);

        return date;
    }

    //creates stripe points for data, returns item count
    this.stripsForMonth = function(strips, data) {
        //clear strips
        strips.innerText = "";

        //if no data, return
        if (!data)
            return;

        //loop through data
        var colors = [];
        var it = data.values();
        var next = it.next();
        var count = 0;
        while (!next.done) {
            //run item through filter, if it returns true don't use item
            if (!this.onFilter(next.value)) {
                var color = next.value[0];

                //if no .point for color yet, create one and append to strips
                if (!colors.includes(color)) {
                    colors.push(color)
                    strips.appendChild(calPoint(color));
                }

                //increment count
                count++;
            }

            //grab next data item
            next = it.next();
        }

        return count;
    }    

    //set month panel content
    this.contentForMonth = function(content, count) {
        if (count > 0)
            content.innerText = count + " Termin" + (count > 1 ? "e" : "");
        else
            content.innerText = "";
    }

    //returns date holding week for passed index
    this.weekForIndex = function(index) {
        //date that will hold week for index
        var date = this.now.mondayOfWeek();
        date.setDate(date.getDate() + index * 7);

        return date;
    }

    //MODE.WEEK when on mobile becomes internal 3-day mode
    this.threeDaysForIndex = function(index) {
        var date = new Date(this.now);
        date.setDate(date.getDate() + index * 3);

        return date;
    }

    //fills one header at date, in week mode
    this.headerForWeek = function(header, date, hasData) {
        //mark header if date for header == Date.NOW
        if (this.now.isEqual(date))
            header.classList.add("calendar-now");
        else
            header.classList.remove("calendar-now");

        //get day of week and date as day
        var dow = date.getDay();
        var day = date.getDate();

        //fill current header
        header.innerText = WEEKDAYS[dow] + ", " + day + "." + (hasData ? "[...]" : "");
    }

    //create panels for week, at column, based on data
    this.panelsForWeek = function(content, data, column) {
        if (!data.value)
            return;

        var unixBase = data.key;    //unix for day of week, at hh,mm,ss = 0

        var it = data.value.entries();
        var next = it.next();
        while(!next.done) {
            //grab next item data
            var value = next.value;

            //run through filter callback, if it returns true don't create item
            if (!this.onFilter(value[1])) {

                //get some required values
                var unix = unixBase + value[0];
                var meta = value[1];

                //append new panel for item data to content
                content.appendChild(calWeekPanel(unix, value[0], meta, column));
            }

            //grab next data item
            next = it.next();
        }
    }
    
    //return index for date in month mode
    this.indexForMonth = function(date) {
        return this.now.monthsTo(date);
    }

    //return index for date in week mode
    this.indexForWeek = function(date) {
        return this.now.weeksTo(date); 
    }

    //return index for date in 3-day [internal] mode -> this rolls around from [di..do] to [do..sa] because 7/3 has rest
    this.indexForThreeDays = function(date, startMonday) {
        var daysTo = startMonday ? this.now.mondayOfWeek().daysTo(date) : this.now.daysTo(date);

        return Math.floor(daysTo / 3);
    }
}

function calMonthTemplate() {
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
        content.appendChild(calMonthPanel());
    }

    //append to container
    template.appendChild(headers);
    template.appendChild(content);

    //return container
    return template;
}

function calMonthPanel() {
    //the panel
    var panel = newDiv("calendar-panel-month");        

    //the section with date of panel | strips to hold .point items
    var section = newDiv("fill");

    //the inner elements
    var date = newDiv("calendar-panel-date");
    var text = newDiv("calendar-panel-inner");
    var strips = newDiv("calendar-panel-strip");

    //append to section
    section.appendChild(date);
    section.appendChild(strips);

    //append to panel
    panel.appendChild(section);
    panel.appendChild(text);

    //return panel
    return panel;
}

function calPoint(color) {
    var point = newDiv("calendar-point");
    point.style.background = color;

    return point;
}

function calWeekTemplate() {
    var classPostfix = isMobile() ? "3-days" : "week";
    var headerCount = isMobile() ? 3 : 7;

    var template = newDiv("");

    //the headers
    var headers = newDiv("calendar-headers");
    for (var c = 0; c < headerCount; c++) {
        var header = newDiv("calendar-header-" + classPostfix);

        headers.appendChild(header);
    }

    //the content wrapper
    var wrapper = newDiv("calendar-content-week-or-days-wrapper");

    //the content
    var content = newDiv("calendar-content-" + classPostfix);

    //the columns (only for borders)
    for (var c = 0; c < 7; c++)
        content.appendChild(newDiv("calendar-column-" + classPostfix));

    //append the ToD strips
    calWeekTimeOfDays(content);

    //append to wrapper
    wrapper.appendChild(content);

    //inner content holds items, so that TimeOfDay strips don't get cleared
    var contentInner = newDiv("calendar-content-" + classPostfix);
    wrapper.appendChild(contentInner);

    //append to container
    template.appendChild(headers);
    template.appendChild(wrapper);

    //return container
    return template;
}

function calWeekTimeOfDays(content) {
    //time of day strips to the left of content
    for (var c = 0; c < (24 - FIRST_HOUR_OF_DAY); c++) {
        //create ToD element
        var timeOfDay = newDiv("calendar-time-of-day");

        //position element
        timeOfDay.style.top = (c * PX_PER_HOUR) + "px";

        //set its content
        timeOfDay.innerText = calWeekRowAsTime(c);

        content.appendChild(timeOfDay);
    }
}

function calWeekRowAsTime(row) {
    row += FIRST_HOUR_OF_DAY;
    row = row > 23 ? row - 24 : row;

    return (row < 10 ? "0" : "") + row + ":00";
}

function calWeekPanel(unix, shortUnix, meta, column) {
    //grab relevant variables
    var color = meta[0];
    var text = meta[1];
    var duration = meta[2];
    var time = calTimeFrom(shortUnix, duration);

    //depending on isMobile
    var classPostfix = isMobile() ? "3-days" : "week";

    //create panel
    var panel = newDiv("card calendar-panel-" + classPostfix);

    //attach panelId -> unix to identify it by (this is the full unixtime, not only intra-day)
    panel.panelId = unix;

    //position and sizing
    var widthMod = isMobile() ? 3 : 7;
    panel.style.left = "calc(100% / " + widthMod + " * " + column + ")";
    panel.style.top = calUnixToOffset(shortUnix) + "px";
    panel.style.height = calUnixToPx(duration) + "px";

    //create section
    var section = newDiv("fill");

    //create and style time element and panel-border-top
    var timeEle = newDiv("calendar-panel-date");
    timeEle.innerText = time;
    timeEle.style.color = color;
    panel.style.borderTop = "2px solid " + color;

    //create content element and set text
    var textEle = newDiv("calendar-panel-inner");
    textEle.innerText = text;

    //append time element to section
    section.appendChild(timeEle);

    //append section and content to panel
    panel.appendChild(section);
    panel.appendChild(textEle);

    //return panel
    return panel;
}

function calTimeFrom(unix, duration) {    
    var start = calUnixTimeToStr(unix);
    var end = calUnixTimeToStr(unix + duration);

    return start + " - " + end;
}

function calUnixTimeToStr(unix) {
    var hhmm = calUnixToHHMM(unix);
    return (hhmm.hours < 10 ? "0" : "") + hhmm.hours + (hhmm.minutes < 10 ? ":0" : ":") + hhmm.minutes;
}

function calUnixToHHMM(unix) {
    var hours = Math.floor(unix / 3600);
    var minutes = Math.floor((unix - (hours * 3600)) / 60);

    return {hours: hours, minutes: minutes};
}

function calUnixToOffset(unix) {
    var px = calUnixToPx(unix);

    //apply first hour of day offset
    px -= PX_PER_HOUR * FIRST_HOUR_OF_DAY;            

    return px < 0 ? px + PX_PER_HOUR * 24 : px;
}

function calUnixToPx(unix) {
    return PX_PER_HOUR * unix / 3600 ;
}