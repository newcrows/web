//Provider extends DateMap
function Provider() {
    DateMap.call(this);
    
    this.iterator = null;
    this.iteratorKey = null;
}

//copy DateMap's prototype and reset constructor
Provider.prototype = Object.create(DateMap.prototype);
Provider.prototype.constructor = Provider;

Provider.prototype.setItem = noop;

Provider.prototype.deleteItem = noop;

Provider.prototype.prepareBind = function(date) {
    //prepare iterating items for passed date
    var dateItems = this.getUnixAll(date.toUnix());
    this.iterator = dateItems.value ? dateItems.value.entries() : null;
    this.iteratorKey = dateItems.key;
}

Provider.prototype.bindNext = function() {
    if (!this.iterator)
        return null;

    //prepare filter loop
    var next = this.iterator.next();
    var show = next.value ? this.filter(next.value[1]) : false;

    //loop until no more items or item found that should show
    while (!next.done && !show) {
        next = this.iterator.next();
        if (next.value)
            show = this.filter(next.value[1]);
    }

    if (next.done)  //no more items for date, return null
        return null;

    //return [unix, {duration, color, text}] formatted item
    return [next.value[0] + this.iteratorKey, this.format(next.value[1])];
}

Provider.prototype.filter = noop_true;

Provider.prototype.format = noop;

Provider.prototype.pushSet = noop;

Provider.prototype.pushDelete = noop;

