let PX_PER_HOUR = 88;
let PX_PER_UNIX = PX_PER_HOUR / 3600;
let FIRST_HOUR_OF_DAY = 8;
let LAST_HOUR_OF_DAY = 22;

let MODES = {
    MONTH: 0,
    WEEK: 1
}

let CALLBACKS = [
    {TEMPLATE: templateMonth, CREATE: createMonth, BIND: bindMonth, CHANGE: changeMonth, CLICK: clickMonth, POSITION: noop, SET: setMonth, DELETE: deleteMonth},
    {TEMPLATE: templateWeek, CREATE: noop, BIND: bindWeek, CHANGE: changeWeek, CLICK: clickWeek, POSITION: posWeek, SET: setWeek, DELETE: deleteWeek}
]

function Calendar(container, strip, mode, now, factory, binder, provider, onModeCallback) {

    /* INTERFACE */

    //start the calendar
    this.start = function() {
        //get mode
        var mode = this.mode;

        //set internal mode to -1 so setMode() rebinds all pages
        this.mode = -1;

        //kick off the calendar
        this.setMode(mode);
    }

    //set the current mode
    this.setMode = function(mode) {
        if (this.mode == mode)
            return;
        this.mode = mode;

        //grab mode callbacks
        var callbacks = CALLBACKS[mode];

        //set mode callbacks
        this.pager.onCreate = callbacks.CREATE.bind(this);
        this.pager.onBind = callbacks.BIND.bind(this);
        this.pager.onChange = callbacks.CHANGE.bind(this);
        this.pager.onClick = callbacks.CLICK.bind(this);

        this.onPosition = callbacks.POSITION.bind(this);

        this.provider.notifySet = callbacks.SET.bind(this);
        this.provider.notifyDelete = callbacks.DELETE.bind(this);

        //set template -> this rebinds pages
        this.pager.setTemplate(callbacks.TEMPLATE.call(this));
        
        //notify callbacks
        this.onMode(mode);
        this.pager.onChange(this.pager.getIndex());
    }

    //get the current mode
    this.getMode = function() {
        return this.mode;
    }

    //get current date shown
    this.getDate = function() {        
        var date = new Date(this.now);
        switch (this.mode) {
            case MODES.MONTH:
                date.addMonths(this.pager.index);
                date = date.mondayBeforeMonth();
                break;
            case MODES.WEEK:
                if (isMobile())
                    date.addDays(this.pager.index * 3);
                else {
                    date = date.mondayOfWeek();
                    date.addDays(this.pager.index * 7);
                }
                break;
            default:
                throw "Invalid Mode";
                         }

        return date;
    }

    //go to a [date] in mode, or keep current date while switching if no date specified
    this.go = function(mode, date) {
        var mode = mode == null ? this.mode : mode;
        var date = date == null ? this.now : date;

        var index;
        switch (mode) {
            case MODES.MONTH:
                index = this.now.monthsTo(date);
                break;
            case MODES.WEEK:
                index = isMobile() ? Math.floor(this.now.daysTo(date) / 3) : this.now.weeksTo(date);
                break;
            default:
                throw "Invalid Mode";
                    }
        
        var dir = 0;
        if (this.pager.getIndex() > index)
            dir = 1;
        else if (this.pager.getIndex() < index)
            dir = -1;

        this.pager.setIndex(index + dir, true);   //true = noReload

        if (this.mode == mode) {
            this.pager.rebindAll();
            this.pager.onChange(this.pager.getIndex());
        } else
            this.setMode(mode);
        
        if (dir != 0)
            this.pager.snap(-dir);
    }

    //pagination
    this.next = function() {
        this.pager.next();
    }

    this.previous = function() {
        this.pager.previous();
    }

    /* IMPLEMENTATION */

    //calendar state
    this.now = now ? now : new Date();
    this.mode = mode ? mode : MODES.MONTH;

    //underlying pager
    this.pager = new ViewPager(container);

    //handler for dim changes
    addEventListener("dimension_changed", function(e) {
        this.pager.index = 0;
        this.start();
    }.bind(this));

    //callbacks
    this.factory = factory ? factory : new NoopFactory();
    this.binder = binder ? binder : new NoopBinder();
    this.provider = provider ? provider : new NoopProvider();
    this.onMode = onModeCallback ? onModeCallback : noop;

    //current date strip
    this.strip = strip;
}

function templateMonth() {
    //create month element
    var month = newDiv("");

    //create headers and append
    for (var c = 0; c < 7; c++) {
        var header = newDiv("cal-header cal-7 cal-float");
        header.innerText = WEEKDAYS[c<6 ? c+1:0];

        month.appendChild(header);
    }

    //create content
    var content = newDiv("cal-content cal-float");

    //fill content with panels
    for (var c = 0; c < 42; c++) {
        //create new empty panel for month
        var panel = newDiv("cal-panel cal-7 cal-h-6 cal-float cal-borders");

        //give factory a chance to customize panel content structure
        this.factory.monthPanel(panel);

        //append to page
        content.appendChild(panel);
    }

    //append content to month element
    month.appendChild(content);

    //return month element
    return month;
}

function createMonth(page) {
    //apply panelId to every panel in month
    var content = page.lastElementChild;
    var panel = content.firstElementChild;
    var id = 0;
    while (panel) {
        panel.panelId = id++;
        panel = panel.nextElementSibling;
    }
}

function bindMonth(page, index) {     
    //grab date for first monday that should be displayed
    var date = new Date(this.now);
    date.setMonth(date.getMonth() + index);

    //get first shown date
    date = date.mondayBeforeMonth(); 

    //grab display month
    var display = date.displayMonth();

    //loop through panels, notifying calendar callbacks for panel-fill
    var content = page.lastElementChild;
    var panel = content.firstElementChild;
    while (panel) {
        var items = this.provider.get(date.toUnix(), 1);
        this.binder.bindMonth(panel, date, items);

        if (date.getMonth() != display)
            panel.classList.add("cal-disabled");
        else
            panel.classList.remove("cal-disabled");

        panel = panel.nextElementSibling;
        date.increment();
    }
}

function changeMonth(index) {
    var date = this.getDate();
    if (this.strip)
        this.strip.innerText = MONTHS[date.displayMonth()] + " " + date.getFullYear();
}

function clickMonth(event) {
    var target = findTraverseUp(event.target, ["cal-panel"]);
    if (!target)
        return;

    var date = this.getDate();
    date.setDate(date.getDate() + target.panelId);

    this.go(MODES.WEEK, date);
}

function setMonth(item) {
    var date = fromUnix(item.unix);
    var page = this.pager.getPageIfLoaded(this.now.monthsTo(date));

    if (!page)
        return;

    var content = page.lastElementChild;
    var panel = content.firstElementChild;

    var date0 = date.mondayBeforeMonth();
    while (panel) {
        if(date0.isEqual(date)) {
            var items = this.provider.get(date.toUnix(), 1);
            this.binder.bindMonth(panel, date, items);
            break;
        }

        panel = panel.nextElementSibling;
        date0.increment();
    }
}

function deleteMonth(item) {
    //just forward to setMonth(..) because it redraws the whole panel anyway
    this.setMonth(item);
}

function templateWeek() {
    var range = isMobile() ? 3 : 7;

    var week = newDiv("");
    for (var c = 0; c < range; c++)
        week.appendChild(newDiv("cal-header cal-" + range + " cal-float"))

    var content = newDiv("cal-content cal-float");

    for (var v = FIRST_HOUR_OF_DAY; v < LAST_HOUR_OF_DAY; v++) {
        var lead = newDiv("cal-panel cal-" + range + " cal-h-88px cal-float cal-borders cal-lead");
        lead.innerText = v;
        content.appendChild(lead);

        for (var c = 1; c < range; c++)
            content.appendChild(newDiv("cal-panel cal-"+ range + " cal-h-88px cal-float cal-borders"));
    }

    week.appendChild(content);
    return week;
}

function bindWeek(page, index) {
    var range = isMobile() ? 3 : 7;

    var date = isMobile() ? new Date(this.now) : new Date(this.now).mondayOfWeek();
    date.addDays(index * range);

    //fill headers
    for(var c = 0; c < range; c++) {
        page.children[c].innerText = WEEKDAYS[date.getDay()] + ", " + date.getDate();
        date.increment();
    }

    //reset date back to normal
    date.addDays(-range);

    //grab content
    var content = page.lastElementChild;
    var panels = content.children;

    //get information about panels attached to content at the moment
    var panelsStartAt = (LAST_HOUR_OF_DAY - FIRST_HOUR_OF_DAY) * range;
    var panelCount = panels.length - panelsStartAt;

    //notify callback -> returns items that binder will use for date-range
    var items = this.provider.get(date.toUnix(), range);
    var count = items.length;
    var index = 0;

    //reuse existing panels
    while (panelCount > 0 && index < count) {
        var panel = panels[panelsStartAt];
        var item = items[index++];

        var show = this.binder.bindWeek(panel, item); 

        if (show) {
            this.onPosition(date, panel, item);

            panelsStartAt++;
            panelCount--;
        }
    }

    //create new panel
    var panel = newDiv("cal-panel cal-" + range + " cal-absolute card");

    //pass to factory for customized content structure
    this.factory.weekPanel(panel);

    while (index < count) {
        var item = items[index++];

        var show = this.binder.bindWeek(panel, item);

        if (show) {
            this.onPosition(date, panel, item);

            content.appendChild(panel); 

            //create new panel
            panel = newDiv("cal-panel cal-" + range + " cal-absolute card");

            //pass to factory for customized content structure
            this.factory.weekPanel(panel);
        }
    }

    //delete left-over panels, if any
    while (panelCount > 0) {
        content.removeChild(panels[panels.length-1]);
        panelCount--;
    }
}

function changeWeek(index) {
    var date = this.getDate();
    if (this.strip)
        this.strip.innerText = "KW " + date.getWeek() + " " + MONTHS[date.getMonth()].substr(0,3) + " " + date.getWeekYear();
}

function clickWeek(event) {
    var target = findTraverseUp(event.target, ["cal-item", "cal-header"]);
    if (!target)
        return;
    
    //TODO: implement call onAction(mode, event)
}

function posWeek(date, panel, item) {
    var itemDate = fromUnix(item.unix);

    var column = date.daysTo(itemDate);
    var short = itemDate.toShortUnix();
    
    if (short / 3600 + panel.style.height.split("px")[0] / PX_PER_HOUR >= LAST_HOUR_OF_DAY) {
        panel.style.display = "none";
    }

    //position panel
    panel.style.top = (PX_PER_UNIX * short - FIRST_HOUR_OF_DAY * PX_PER_HOUR) + "px";
    //panel.style.height = PX_PER_UNIX * item.duration + "px";
    panel.style.left = "calc(100% / " + (isMobile() ? 3 : 7) + " * " + column + ")";

    //attach item.unix as panel.unix to find it later
    panel.unix = item.unix;
}

function setWeek(item) {
    //find target page via index for target
    var date = fromUnix(item.unix);
    var index = this.now.weeksTo(date);
    var page = this.pager.getPageIfLoaded(index);

    //page not loaded, return
    if (!page)
        return;

    //find panel -> loop through page's panels
    var content = page.lastElementChild;
    var panel = weekPanelByUnix(content, item.unix);

    //if panel doesn't exist
    if (!panel) {
        //create new panel
        panel = newDiv("cal-panel cal-" + (isMobile() ? 3 : 7) + " cal-absolute card");

        //pass to factory for customized content structure
        this.factory.weekPanel(panel);

        //append new panel
        content.appendChild(panel);
    }

    //bind panel with changed item
    var show = this.binder.bindWeek(panel, item);

    //decide if panel should show
    if (show) {
        //position panel -> top,left,height
        this.onPosition(date.mondayOfWeek(), panel, item);
    } else {
        content.removeChild(panel);
    }
}

function deleteWeek(unix) {
    //find target page via index for target
    var date = fromUnix(unix);
    var index = this.now.weeksTo(date);
    var page = this.pager.getPageIfLoaded(index);

    //page not loaded, return
    if (!page)
        return;

    //find panel -> loop through page's panels
    var panel = weekPanelByUnix(page.lastElementChild, unix);

    //if found, delete panel
    if (panel)
        panel.parentElement.removeChild(panel);
}

function weekPanelByUnix(content, unix) {
    var panel = content.children[(LAST_HOUR_OF_DAY-FIRST_HOUR_OF_DAY) * (isMobile() ? 3 : 7)];
    while (panel) {
        if (panel.unix == unix) {
            found = true;
            break;
        }

        panel = panel.nextElementSibling;
    }

    return panel;
}

function NoopFactory() {
    console.log("Warning: No factory set.");

    this.monthPanel = noop;
    this.weekPanel = noop;
}

function NoopBinder() {
    console.log("Warning: No binder set.");

    this.bindMonth = noop;
    this.bindWeek = noop;
}

function NoopProvider() {
    console.log("Warning: No provider set.")

    this.get = noop;
}