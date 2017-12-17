function Factory() {

    this.monthPanel = function(panel) {

    }

    this.weekPanel = function(panel) {
        panel.style.borderBottom = "1px solid white";
        panel.style.borderRight = "1px solid white";
    }
}

function Binder(filter) {
    if (!filter)
        console.log("Warning: No filter set. Calendar will render nothing.");

    this.filter = filter ? filter : noop;

    this.bindMonth = function(panel, date, items) {
        panel.innerText = date.getDate();
    }

    this.bindWeek = function(panel, item) {
        panel.style.color = "white";
        panel.style.background = item.content == "item_0" ? "coral" : "cornflowerblue";
        panel.innerText = item.content;

        return filter(item);    //filter here -> return false to hide item
    }
}

function Provider() {

    this.get = function(unix, range) {
        return [{
            unix: unix,
            duration: 3600,
            content: "item_0"
        }, {
            unix: unix + (3600 * 24),
            duration: 2700,
            content: "item_1"
        }];
    }
}
