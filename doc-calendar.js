function Factory() {

    this.monthPanel = function(panel) {
        var section = newDiv("fill");

        section.appendChild(newDiv("cal-date"));
        section.appendChild(newDiv("cal-strips"));

        panel.appendChild(section);
        panel.appendChild(newDiv("cal-text"));
    }

    this.weekPanel = function(panel) {
        panel.classList.add("cal-item");

        panel.appendChild(newDiv());
        panel.appendChild(newDiv());
    }
}

function Binder(filter) {
    if (!filter)
        console.log("Warning: No filter set. Calendar will show nothing.");

    this.filter = filter ? filter : noop;

    this.bindMonth = function(panel, date, items) {
        var section = panel.firstElementChild;

        var dateE = section.firstElementChild;
        dateE.innerText = date.getDate();

        var strips = section.lastElementChild;
        strips.innerText = "";

        var colors = [];
        var count = 0;
        for (var c = 0; c < items.length; c++) {
            var item = DEFAULT_ITEMS[items[c].type];
            var show = this.filter(item);
            if (show) {
                if (!colors.includes(item.color)) {
                    colors.push(item.color);

                    var point = newDiv("cal-point");
                    point.style.background = item.color;
                    strips.appendChild(point);
                }
                count++;
            }
        }

        var text = panel.lastElementChild;
        if (count > 0)
            text.innerText = count + " Termin" + (count > 1 ? "e" : "");
        else
            text.innerText = "";
    }

    this.bindWeek = function(panel, item) {
        var show = filter(item);
        if (show) { 
            var unix = item.unix;
            var item = DEFAULT_ITEMS[item.type];

            panel.style.background = item.color;
            panel.style.height = PX_PER_UNIX * item.duration + "px";

            var start = fromUnix(unix);
            var end = fromUnix(unix + item.duration);
            var str = start.asHHMMString() + "-" + end.asHHMMString();

            panel.firstElementChild.innerText = str;
            panel.lastElementChild.innerText = item.content;
        }

        return show;
    }
}

function Provider() {

    this.data = new DateMap();

    this.get = function(unix, range) {       
        var date = fromUnix(unix);
        var items = [];

        for (var c = 0; c < range; c++) {
            var map = this.data.getUnixAll(date.toUnix()).value;
            if (!map)
                values = [];
            else {
                values = [...map.values()];
            }

            items = items.concat(values);
            date.increment();
        }

        //TODO: instead of array return array of maps
        return items;
    }
    
    //get an item from provider
    this.getItem = function(unix) {
        return this.data.getUnix(unix);
    }

    this.setItem = function(item) {
        //update provider data
        this.data.setUnix(item.unix, item);

        //notify calendar that content changed
        this.notifySet(item);
    }

    this.deleteItem = function(unix) {
        //update provider data
        this.data.deleteUnix(unix);

        //notify calendar that content changed
        this.notifyDelete(unix);
    }

    this.notifySet = noop;      //calendar injects this function into provider
    this.notifyDelete = noop;   //calendar injects this function into provider
}

let DEFAULT_ITEMS = [
    {color: "#FFB300", content: "90 Min Theorie Thema 1", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 2", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 3", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 4", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 5", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 6", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 7", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 8", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 9", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 10", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 11", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema 12", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema B13", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema B14", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema A1", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema A2", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema A3", duration: 5400},
    {color: "#FFB300", content: "90 Min Theorie Thema A4", duration: 5400},
    {color: "#039BE5", content: "Fahren 45 Min", duration: 2700},
    {color: "#43A047", content: "Landfahrt 90 Min", duration: 5400},
    {color: "#43A047", content: "Autobahnfahrt 90 Min", duration: 5400},
    {color: "#43A047", content: "Nachtfahrt 90 Min", duration: 5400},
    {color: "#F4511E", content: "Prüfung 45 Min", duration: 2700},
    {color: "#757575", content: "Frei 45 Min", duration: 2700},
    {color: "#757575", content: "Frei 45x2 Min", duration: 2700 * 2},
]
