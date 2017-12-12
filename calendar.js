let MODE_MONTH = 0;
let MODE_WEEK = 1;
let MODE_THREE_DAYS = 2;
let MODE_DAY = 3;

function Calendar(container, data, mode, anchor, strip) { 
    this.container = container;
    container.classList.add("vp-calendar");

    //calendar state
    this.data = data ? data : new StackedMap();   //the data backing this calendar
    this.mode = -1;                               //setMode(..) is called later in constructor, so give this an invalid mode
    this.anchor = anchor ? anchor : new Date();   //use Date.NOW as default anchor
    this.strip = strip;                           //calendar strip displaying current date

    /* GETTERS / SETTERS */

    this.setMode = function(mode) {
        //if already in mode, return
        if (mode == this.mode)
            return;
        this.mode = mode;

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

        //set template for pager
        this.pager.setTemplate(template);
    };

    this.getMode = function() {
        return this.mode;
    }

    this.setAnchor = function(anchor) {
        this.anchor = anchor;
        this.pager.rebindAll();
    };

    this.getAnchor = function() {
        return this.anchor;
    }

    /* TRIGGERS */

    //just delegate pagination
    this.next = function() {
        this.pager.next();
    }

    //just delegate pagination
    this.previous = function() {
        this.pager.previous();
    }

    /* VIEWPAGER CALLBACKS */

    //bind content for a full page
    this.onBind = function(page, index) {
        //TODO: populate page here, based on passed index and mode
        console.log("onBind => " + page + ":" + index);        
    }.bind(this);

    //update strip if index changes
    this.onChange = function(newIndex) {
        if (!this.strip)
            return;

        this.strip.innerText = this.anchor.toDateString();        
    }.bind(this);

    //attach metadata to template clones
    this.onCreate = function(page) {
        switch (this.mode) {
            case MODE_MONTH:
                calendarOnCreateMonth(page);
                break;
            case MODE_WEEK:
            case MODE_THREE_DAYS:
            case MODE_DAY:
                //nothing to do here, at least for now
                break;
            default:
                throw "Invalid Mode";
                         }
    }.bind(this);

    //navigate through modes
    this.onClick = function(e) {
        //TODO: navigate here, based on clicks and mode
    }.bind(this);

    //sync scroll state in WEEK_MODE, THREE_DAY_MODE or DAY_MODE
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

    //create viewpager for this calendar
    this.pager = new ViewPager(container,
                               [-Infinity, Infinity],
                               this.onBind,
                               this.onChange,
                               this.onCreate,
                               this.onClick,
                               this.onBeforeChange);

    //kick of template creation and, subsequently, binding
    this.setMode(mode ? mode : MODE_MONTH);

    //manually call onChange(index=0) once, to update calendar strip to current day/mode
    this.onChange(0);
}

function calendarMonthTemplate() {
    //the container
    var template = newDiv("");

    //the headers
    var headers = newDiv("calendar-headers");
    for (var c = 0; c < 7; c++) {
        var header = newDiv("calendar-header-month-or-week");
        header.innerText = "H" + c;

        headers.appendChild(header);
    }

    //the content, fill with panels
    var content = newDiv("calendar-content-month");
    for (var c = 0; c < 42; c++) {
        var panel = newDiv("calendar-panel-month");        

        var section = newDiv("fill");
        section.appendChild(newDiv("calendar-panel-date"));
        section.appendChild(newDiv("calendar-panel-strip"));
        panel.appendChild(section);

        panel.appendChild(newDiv("calendar-panel-inner"));

        content.appendChild(panel);
    }

    //append to container
    template.appendChild(headers);
    template.appendChild(content);

    //return container
    return template;
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

function calendarWeekTemplate() {
    var template = newDiv("");

    //the headers
    var headers = newDiv("calendar-headers");
    for (var c = 0; c < 7; c++) {
        var header = newDiv("calendar-header-month-or-week");
        header.innerText = "H" + c;

        headers.appendChild(header);
    }

    //the content wrapper
    var wrapper = newDiv("calendar-content-week-or-days-wrapper");

    //the content
    var content = newDiv("calendar-content-week");

    //append the ToD strips
    calendarTimeOfDayStrips(content);

    //append to wrapper
    wrapper.appendChild(content);

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
    
    //append the ToD strips
    calendarTimeOfDayStrips(content);

    //append to wrapper
    wrapper.appendChild(content);

    //append to container
    template.appendChild(headers);
    template.appendChild(wrapper);

    //return container
    return template;
}

function calendarDayTemplate() {
    var template = newDiv("");

    //the header
    var header = newDiv("calendar-header-day");
    header.innerText = "Header";

    //the content wrapper
    var wrapper = newDiv("calendar-content-week-or-days-wrapper");

    //the content
    var content = newDiv("calendar-content-day");
    
    //append the ToD strips
    calendarTimeOfDayStrips(content);

    //append to wrapper
    wrapper.appendChild(content);

    //append to container
    template.appendChild(header);
    template.appendChild(wrapper);

    //return container
    return template;
}

function calendarTimeOfDayStrips(content) {
    //time of day strips to the left of content
    var off = 7;    //start at 07:00 AM
    for (var c = 0; c < 24; c++) {
        //create ToD element
        var timeOfDay = newDiv("calendar-time-of-day");

        //position element
        timeOfDay.style.top = (c * 88 + 68) + "px";

        //set its content
        timeOfDay.innerText = calendarAsHours(c, off);

        content.appendChild(timeOfDay);
    }
}

function calendarAsHours(c, off) {
    c += off;
    c = c > 23 ? c - 24 : c;

    return (c < 10 ? "0" : "") + c + ":00";
}