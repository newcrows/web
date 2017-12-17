let PX_PER_HOUR = 88;
let HOURS_PER_DAY = 24;
let PX_PER_UNIX = 88 / 3600;

let MODES = {
    MONTH: 0,
    WEEK: 1
}

let CALLBACKS = [
    {TEMPLATE: templateMonth, CREATE: createMonth, BIND: bindMonth, CHANGE: changeMonth, CLICK: clickMonth, POSITION: noop},
    {TEMPLATE: templateWeek, CREATE: createWeek, BIND: bindWeek, CHANGE: changeWeek, CLICK: clickWeek, POSITION: posWeek}
]

function Calendar(container, mode, now, factory, binder, provider) {

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

        //grab callbacks
        var callbacks = CALLBACKS[mode];

        //set callbacks
        this.pager.onCreate = callbacks.CREATE.bind(this);
        this.pager.onBind = callbacks.BIND.bind(this);
        this.pager.onChange = callbacks.CHANGE.bind(this);
        this.pager.onClick = callbacks.CLICK.bind(this);
        this.onPosition = callbacks.POSITION.bind(this);

        //set template -> this rebinds pages
        this.pager.setTemplate(callbacks.TEMPLATE.call(this));
    }

    //get the current mode
    this.getMode = function() {
        return this.mode;
    }

    //TODO: implement
    //go to a [date] in mode, or keep current date while switching if no date specified
    this.go = function(mode, date) {
        //TODO: implement
    }

    /* IMPLEMENTATION */

    //calendar state
    this.now = now ? now : new Date();
    this.mode = mode ? mode : MODES.MONTH;

    //underlying pager
    this.pager = new ViewPager(container);

    //handler for dim changes
    addEventListener("dimension_changed", function(e) {
        this.start();
    }.bind(this));

    //callbacks
    this.factory = factory ? factory : new NoopFactory();
    this.binder = binder ? binder : new NoopBinder();
    this.provider = provider ? provider : new NoopProvider();
}

function templateMonth() {
    //console.log("templateMonth()");

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
    //console.log("createMonth(" + page + ")");

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
    //console.log("bindMonth(" + page + ", " + index + ")");

    //grab date for first monday that should be displayed
    var date = new Date(this.now);
    date.setMonth(date.getMonth() + index);

    //grab display month
    var display = date.displayMonth();

    //get first shown date
    date = date.mondayBeforeMonth(); 

    //loop through panels, notifying calendar callbacks for panel-fill
    var content = page.lastElementChild;
    var panel = content.firstElementChild;
    while (panel) {
        panel.innerText = "";
        var items = this.provider.get(date.toUnix(), 1);
        this.binder.bindMonth(panel, date, items);

        if (date.getMonth() != display)
            panel.classList.add("cal-disabled");

        panel = panel.nextElementSibling;
        date.increment();
    }
}

function changeMonth(index) {
    //console.log("changeMonth(" + index + ")");
}

function clickMonth(event) {
    //console.log("clickMonth(" + event.target + ")");
}

function templateWeek() {
    //console.log("templateWeek()");

    var range = isMobile() ? 3 : 7;

    var week = newDiv("");
    for (var c = 0; c < range; c++)
        week.appendChild(newDiv("cal-header cal-" + range + " cal-float"))

    var content = newDiv("cal-content cal-float");

    for (var v = 0; v < HOURS_PER_DAY; v++) {
        var lead = newDiv("cal-panel cal-" + range + " cal-h-88px cal-float cal-borders cal-lead");
        lead.innerText = v;
        content.appendChild(lead);

        for (var c = 1; c < range; c++)
            content.appendChild(newDiv("cal-panel cal-"+ range + " cal-h-88px cal-float cal-borders"));
    }

    week.appendChild(content);
    return week;
}

function createWeek(page) {
    //console.log("createWeek(" + page + ")");
}

function bindWeek(page, index) {
    //console.log("bindWeek(" + page + ", " + index + ")");

    var range = isMobile() ? 3 : 7;

    var date = new Date(this.now).mondayOfWeek();
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
    var panelsStartAt = HOURS_PER_DAY * range;
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
    //console.log("changeWeek(" + index + ")");
}

function clickWeek(event) {
    //console.log("clickWeek(" + event.target + ")");
}

function posWeek(date, panel, item) {
    var itemDate = fromUnix(item.unix);

    var column = date.daysTo(itemDate);
    var short = itemDate.toShortUnix();

    panel.style.top = PX_PER_UNIX * short + "px";
    panel.style.height = PX_PER_UNIX * item.duration + "px";
    panel.style.left = "calc(100% / " + (isMobile() ? 3 : 7) + " * " + column + ")";
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