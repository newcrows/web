/* A Calendar implementation based on ViewPager

    required .css classes:
    
    .cal-container {
        --primary-text: #ffffff;
        --primary: #00695C;

        --disabled-text: #d3d3d3;
        --disabled: #f7f7f7;

        --lead-text: #808080;

        --border: #eaeaea;
    }

    .cal-header { 
        position: relative;
        padding: 4px;

        box-sizing: border-box;
        box-shadow: 0 2px 2px 0 rgba(0,0,0,0.14), 0 1px 5px 0 rgba(0,0,0,0.12), 0 3px 1px -2px rgba(0,0,0,0.2);
        border-radius: 0px;
        height: 33px;

        color: var(--primary-text);
        background: var(--primary);

        text-align: center;
        z-index: 1;
    }

    .cal-content {   
        position: relative;

        box-sizing: border-box;
        width: 100%;
        height: calc(100% - 33px);

        overflow-x: hidden;
        overflow-y: scroll;
    }

    .cal-panel {
        padding: 4px;
        box-sizing: border-box;
        overflow: hidden;
    }

    .cal-absolute {
        position: absolute;
    }

    .cal-lead {
        color: var(--lead-text);
    }

    .cal-borders {
        border-right: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
    }

    .cal-7 {
        width: calc(100% / 7);
    }

    .cal-3 {
        width: calc(100% / 3);
    }

    .cal-h-6 {
        height: calc(100% / 6);
    }

    .cal-h-6:hover {
        background: var(--border);
    }

    .cal-h-88px {
        height: 88px;
    }

    .cal-float {
        float: left;
    }

    .cal-disabled {
        color: var(--disabled-text);
        background: var(--disabled);
    }

    .cal-now {
        padding: 2px;
        border: 2px solid red;
    }

    .cal-date {
        float: left;
    }

    .cal-strips {
        float: right;
    }

    .cal-text {
        text-align: center;
    }

    .cal-item {
        color: var(--primary-text);
        border-bottom: 1px solid white;
        border-right: 1px solid white;
    }

    .cal-item:hover {
        filter: brightness(90%);
        cursor: pointer;
    }

    .cal-point {
        float: right;
        padding: 8px;

        margin-top: 4px;
        margin-left: 2px;

        border-radius: 4px;
    }
    
    HOW TO USE:
    
    in mark-up, declare an empty div that will be used as container:
    
        <div id="my-calendar"></div>
        
    then create a custom provider that will populate the calendar:
    
    var myProvider = new Provider();
    
    myProvider.setItem = function(data) {
        //convert your data to something identified by unixtime here and add it to [this]
        this.setUnix(data.unix, data.item);
        
        //and push [set] to the calendar
        this.pushSet(data.unix, data.item);
    }
    
    myProvider.deleteItem = function(data) {
        //convert your data to unixtime here and delete it from [this]
        this.deleteUnix(data.unix);
        
        //and push [delete] to the calendar
        this.pushDelete(data.unix);
    }
    
    myProvider.format(item) {
        //item is the same you pushed in myProvider.setItem(..)
        
        //convert it to a format the calendar can handle
        return {duration: item.duration, color: item.color, text: item.text};
        
        //NOTE: you can also reuse pre-defined items here!
        //declare a constant somewhere: let MY_BLUE_HOUR = {duration: 3600, color: blue, text: "it's blue"};
        //and return it here based on your item:
        //if (item.isAwesome)
        //  return MY_BLUE_HOUR;
        //else
        //  return {item.duration, color: item.color, text: "buhu! not awesome."};
    }
    
    to make it all go live, create a calendar, pass it your container and provider and start it in the mode you want:
    
    var myCalendar = new Calendar(document.querySelector("#my-calendar"), myProvider);
    myCalendar.start(MODES.WEEK);
    
    that's it! The calendar is now usable.
    NOTE: for container size, same rules as for ViewPager apply, as Calendar extends it.
    
    if you need to listen for events, hook one of:
    
        onDateChange(dateString);
            dateString is the pre-formatted version for current mode. change the constants in exdate.js to your desired language
            
        onModeChange(mode);
            mode is the new mode
            
        onAction(mode, target);
            target is an ExDate object in MONTH mode, a unix timestamp in WEEK mode
            only existing items clicked generate an action.
            only if not swiping, an action is generated.
        
    to navigate programmatically, use one of:
    
        next();
            moves one page forward in current mode
            
        previous();
            moves one page backward in current mode
            
        go(mode, date);
            moves to the passed mode and date [date must be an ExDate object]
            
    to globally change hour-range in WEEK mode, change the constants:
        
        FIRST_HOUR_OF_DAY
        LAST_HOUR_OF_DAY
        
    item height in MONTH mode is always 1/6th of container height
    
    item height in WEEK mode is PX_PER_UNIX * item.duration
    
    if you change PX_PER_HOUR or PX_PER_UNIX, you need to change the .css class cal-h-88px too. (without renaming it)
*/

let PX_PER_HOUR = 88;
let PX_PER_UNIX = PX_PER_HOUR / 3600;
let FIRST_HOUR_OF_DAY = 8;
let LAST_HOUR_OF_DAY = 22;

let MODES = {
    MONTH: 0,
    WEEK: 1
}

//Calendar extends ViewPager
function Calendar(container, provider) {
    //call constructor of ViewPager on this (because Calendar extends Viewpager anyway)
    ViewPager.call(this, container);
    container.classList.add("cal-container");

    //grab provider
    this.provider = provider;

    //internal state
    this.mode = -1;
    this.now = new ExDate();

    //dimension change handler
    addEventListener("dimension_changed", function() {
        //reset state on dimension change
        var mode = this.mode;        
        this.mode = -1;
        this.index = 0;
        this.setMode(mode);
    }.bind(this));
}

//copy ViewPager's prototype and reset constructor
Calendar.prototype = Object.create(ViewPager.prototype);
Calendar.prototype.constructor = Calendar;

//Calendar extended functions
Calendar.prototype.start = function(mode) {    
    //kick off calendar
    this.go(mode == null ? MODES.MONTH : mode, this.now);
}

Calendar.prototype.onDateChange = noop;

Calendar.prototype.onModeChange = noop;

Calendar.prototype.onAction = noop;

Calendar.prototype.go = function(mode, date) {                    
    //grab mode before
    var modeBefore = this.mode;

    //noReload = true if not in target mode, noReload = false if already in target mode 
    this.setIndex(this.indexForDate(mode, date), this.mode != mode);
    //if not in target mode, this sets target mode and reloads pages, if already in target mode this does nothing
    this.setMode(mode);
    
    //check mode  after, and if changed, manually trigger onDateChanged
    if (modeBefore != this.mode) {
        this.onChange(this.index);
    }
}

Calendar.prototype.setMode = function(mode) {
    //if already in target mode, do nothing
    if (this.mode == mode)
        return;

    //get callbacks for target mode and attach them to pager or calendar
    var calls = Calendar.callbacks[mode];
    this.onCreate = calls.onCreate.bind(this);
    this.onBind = calls.onBind.bind(this);
    this.onChange = calls.onChange.bind(this);
    this.onClick = calls.onClick.bind(this);

    this.onCreatePanel = calls.onCreatePanel.bind(this);
    this.onSet = calls.onSet.bind(this);
    this.onDelete = calls.onDelete.bind(this);

    //inject pushSet, pushDelete into provider, if there is one
    if (this.provider) {
        this.provider.pushSet = this.onSet.bind(this);
        this.provider.pushDelete = this.onDelete.bind(this);
    }

    //load template for target mode
    var template;
    switch(mode) {
        case MODES.MONTH:
            template = this.monthTemplate();
            break;
        case MODES.WEEK:
            template = this.weekTemplate();
            break;
        default:
            throw "Invalid mode";
               }

    //kick of template creation and associated rebind
    this.setTemplate(template);

    //update mode
    this.mode = mode;

    //notify callback that mode changed
    this.onModeChange(mode);
}

Calendar.prototype.indexForDate = function(mode, date) {
    switch(mode) {
        case MODES.MONTH:
            return this.now.monthsTo(date);
        case MODES.WEEK:
            if (isMobile())
                return Math.floor(this.now.daysTo(date) / 3);
            else
                return this.now.weeksTo(date);  //this internally calls mondayOfWeek() accordingly
        default:
            throw "Invalid mode";
               }
}

Calendar.prototype.dateForIndex = function(mode, index) {
    var date = new ExDate(this.now);
    switch(mode) {
        case MODES.MONTH:
            date.addMonths(index);
            return date.mondayBeforeMonth();
        case MODES.WEEK:
            if (isMobile())
                date.addDays(index * 3);
            else {
                date = date.mondayOfWeek();
                date.addDays(index * 7);
            }
            return date;
        default:
            throw "Invalid mode";
               }
}

Calendar.prototype.monthTemplate = function() {
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

        //notify callback to add custom DOM
        this.onCreatePanel(panel);

        //append to page
        content.appendChild(panel);
    }

    //append content to month element
    month.appendChild(content);

    //return month element
    return month;
}

Calendar.prototype.weekTemplate = function() {
    var range = isMobile() ? 3 : 7;

    var week = newDiv("");
    for (var c = 0; c < range; c++)
        week.appendChild(newDiv("cal-header cal-" + range + " cal-float"))

    var content = newDiv("cal-content cal-float");

    for (var v = FIRST_HOUR_OF_DAY; v < LAST_HOUR_OF_DAY; v++) {
        var lead = newDiv("cal-panel cal-" + range + " cal-h-88px cal-float cal-borders cal-lead");
        lead.innerText = (v < 10 ? "0" : "") + v + ":00";
        content.appendChild(lead);

        for (var c = 1; c < range; c++)
            content.appendChild(newDiv("cal-panel cal-"+ range + " cal-h-88px cal-float cal-borders"));
    }

    week.appendChild(content);
    return week;
}

//Calendar static functions
Calendar.callbacks = [
    {   //MODE.MONTH
        onCreate: function(page) {
            //grab page content
            var content = page.lastElementChild;

            //attach panelId to panels
            var id = 0;
            var panel = content.firstElementChild;
            while(panel) {
                panel.panelId = id++;
                panel = panel.nextElementSibling;
            }
        },
        onSet: function(unix, item) {                          
            //grab date for unix
            var date = ExDate.fromUnix(unix);

            //get index date would be on
            var index = this.indexForDate(MODES.MONTH, date);

            //get page if loaded
            var page = this.getPageIfLoaded(index);

            //if not loaded, nothing more to do
            if (!page)
                return;

            //get content
            var content = page.lastElementChild;

            //get panel item lives on
            var panelId = this.dateForIndex(MODES.MONTH, index).daysTo(date);
            var panel = content.children[panelId];

            //redraw the panel
            Calendar.callbacks[MODES.MONTH].onBindPanel.call(this, panel, date);
        },
        onDelete: function(unix) {
            //forward to onSet as it redraws panel anyway
            Calendar.callbacks[MODES.MONTH].onSet.call(this, unix, null);
        },
        onBind: function(page, index) {
            //grab page content
            var content = page.lastElementChild;

            //get date for index
            var date = this.dateForIndex(MODES.MONTH, index);

            //get display month for index
            var display = date.displayMonth();

            //loop through panels
            var panel = content.firstElementChild;
            while(panel) {
                //grab panel's class-list
                var classes = panel.classList;

                //disable when not display-month
                if (date.getMonth() != display)
                    classes.add("cal-disabled");
                else
                    classes.remove("cal-disabled");

                //mark red when current date
                if (this.now.isEqualDate(date))
                    classes.add("cal-now");
                else
                    classes.remove("cal-now");

                //bind the panel
                Calendar.callbacks[MODES.MONTH].onBindPanel.call(this, panel, date);

                //grab next panel/date
                panel = panel.nextElementSibling;
                date.increment();
            }
        },
        onBindPanel: function(panel, date) {
            //get section
            var section = panel.firstElementChild;

            //set date-text
            section.firstElementChild.innerText = date.getDate();

            //prepare strips
            var strips = section.lastElementChild;
            strips.innerText = "";

            //prepare iterating items for date
            this.provider.prepareBind(date);

            //collect colors and count items
            var colors = [];
            var count = 0;
            var next = this.provider.bindNext();
            while (next) {
                var color = next[1].color;
                if (!colors.includes(color)) {
                    //create a point for item color
                    var point = newDiv("cal-point");
                    point.style.background = color;

                    //append point to strips
                    strips.appendChild(point);

                    //remember which colors already in use
                    colors.push(color);
                }
                //increment count
                count++;

                //grab next item
                next = this.provider.bindNext();
            }

            //set panel text to item count, or empty if mobile || count = 0
            var text = panel.lastElementChild;
            if (count > 0 && !isMobile())
                text.innerText = count + " Termin" + (count > 1 ? "e" : "");
            else
                text.innerText = "";
        },
        onChange: function(index) {
            var date = this.dateForIndex(MODES.MONTH, index);
            var month = date.displayMonth();

            this.onDateChange(MONTHS[month] + " " + date.displayYear());
        },
        onClick: function(event) {
            var target = findTraverseUp(event.target, ["cal-panel"]);
            if (!target)
                return;

            var clickedDate = this.dateForIndex(MODES.MONTH, this.index);
            clickedDate.addDays(target.panelId);

            this.onAction(MODES.MONTH, clickedDate);
        },
        onCreatePanel: function(panel) {
            //add custom DOM to month-panel
            var section = newDiv("fill");

            section.appendChild(newDiv("cal-date"));
            section.appendChild(newDiv("cal-strips"));

            panel.appendChild(section);
            panel.appendChild(newDiv("cal-text"));
        }
    },
    {   //MODE.WEEK
        onCreate: noop,
        onSet: function(unix, item, remove) {
            //grab date for item
            var date = ExDate.fromUnix(unix);

            //get index date would be on
            var index = this.indexForDate(MODES.WEEK, date);

            //get page if loaded
            var page = this.getPageIfLoaded(index);

            //if not loaded, nothing more to do
            if (!page)
                return;

            //get column
            var column = this.dateForIndex(MODES.WEEK, index).daysTo(date);

            //get content
            var content = page.lastElementChild;

            //get range (3-days or week)
            var range = isMobile() ? 3 : 7;

            //find panel with matching unix, if any
            var panelsStartAt = range * (LAST_HOUR_OF_DAY - FIRST_HOUR_OF_DAY);
            var panel = content.children[panelsStartAt];
            while (panel) {
                if (panel.unix == unix) {
                    //FOUND!
                    break;
                }

                panel = panel.nextElementSibling;
            }

            if (!panel && !remove) {
                //create panel
                panel = this.onCreatePanel(range);
                content.appendChild(panel);
            } else if (remove){
                //remove instead of binding
                if (panel)
                    content.removeChild(panel);

                //skip bind call, because remove=true
                return;
            }

            //bind the panel
            Calendar.callbacks[MODES.WEEK].onBindPanel.call(this, panel, unix, item, range, column);
        },
        onDelete: function(unix) {
            //pass to onSet with flag: remove=true
            Calendar.callbacks[MODES.WEEK].onSet.call(this, unix, null, true);
        },
        onBind: function(page, index) {                            
            //grab page content
            var content = page.lastElementChild;

            //get date for index
            var date = this.dateForIndex(MODES.WEEK, index);

            //prepare looping dates
            var range = isMobile() ? 3 : 7;

            //prepare panel reuse
            var panelsStartAt = range * (LAST_HOUR_OF_DAY - FIRST_HOUR_OF_DAY);
            var nextPanel = content.children[panelsStartAt];
            var count = 0;  //used to clean up leftover panels later

            //loop dates for week/3-days
            for (var c = 0; c < range; c++) {  
                //set header
                var header = page.children[c];
                header.innerText = WEEKDAYS[date.getDay()] + ", " + date.getDate();

                if (this.now.isEqualDate(date))
                    header.classList.add("cal-now");
                else
                    header.classList.remove("cal-now");

                //prepare provider
                this.provider.prepareBind(date);

                //loop through items
                var item = this.provider.bindNext();
                while (item) {
                    var panel;
                    if (nextPanel) {
                        //use up existing panels first
                        panel = nextPanel;
                        nextPanel = nextPanel.nextElementSibling;
                    } else {
                        //create new panel if no more reusable panels
                        panel = this.onCreatePanel(range);
                        content.appendChild(panel);
                    }

                    //bind the panel
                    Calendar.callbacks[MODES.WEEK].onBindPanel(panel, item[0], item[1], range, c);

                    //increment panel count by 1 and get next item
                    count++;
                    item = this.provider.bindNext();
                }

                //go to next date in week
                date.increment();
            }

            //destroy left-over panels, if any
            var panel = content.children[panelsStartAt + count];
            while (panel) {
                var next = panel.nextElementSibling;
                content.removeChild(panel);
                panel = next;
            }

            //bind finished
        },
        onBindPanel: function(panel, unix, item, range, column) {
            //set offset from top
            var shortStart = ExDate.unixToShortUnix(unix);
            panel.style.top = shortStart * PX_PER_UNIX - (FIRST_HOUR_OF_DAY * 88) + "px";

            //set height depending on duration
            panel.style.height = item.duration * PX_PER_UNIX + "px";

            //set left offset depending on column
            panel.style.left = "calc(100% / " + range + " * " + column + ")";

            //set background according to item.color
            panel.style.background = item.color;

            //set time-span according to item.start, item.end
            var span = panel.firstElementChild;
            span.innerText = ExDate.HHMMStringFromShortUnix(shortStart) + "-" + ExDate.HHMMStringFromShortUnix(shortStart + item.duration);

            //set text according to item.text
            var text = panel.lastElementChild;
            text.innerText = item.text;

            //attach unix to panel
            panel.unix = unix;
        },
        onChange: function(index) {
            var date = this.dateForIndex(MODES.WEEK, index);

            this.onDateChange("KW " + date.getWeek() + " " + MONTHS[date.getMonth()].substr(0,3) + " " + date.getWeekYear());
        },
        onClick: function(event) {                            
            var target = findTraverseUp(event.target, ["cal-item"]);

            if (!target)
                return;

            this.onAction(MODES.WEEK, target.unix);
        },
        onCreatePanel: function(range) {
            //create new panel
            var panel = newDiv("cal-item cal-panel cal-" + range + " cal-absolute card");
            panel.appendChild(newDiv());
            panel.appendChild(newDiv());

            //return new panel
            return panel;
        }
    }
]
