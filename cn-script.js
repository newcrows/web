window.CN = {};
window.CN.DOC_REFS = [];

//TODO: manage dependencies correctly
function injectDocRef() {
    window.CN.DOC_REFS.push(document.currentScript.ownerDocument);
}

function addClass(el, clazz) {
    el.className += " " + clazz;
}

function removeClass(el, clazz) {
    let classes = clazz.split(" ");
    for (var c = 0; c < classes.length; c++)
        el.classList.remove(classes[c]);
}

function newElement(tag, className) {
    var ele = document.createElement(tag);
    if (className)
        ele.className = className;

    return ele;
}

function newDiv(className) {
    return newElement("DIV", className);
}

function applySize(el, w, h) {
    if (w != null)
        el.style.width = w;
    if (h != null)
        el.style.height = h;
}

function ratio(ratio) {
    return "calc(100% / " + ratio + ")";
}

function upwardTarget(el, clazz) {
    while (el) {
        if (el.classList.contains(clazz))
            return el;
        el = el.parentElement;
    }

    return null;
}

Date.prototype.increment = function () {
    this.addDays(1);
}

Date.prototype.decrement = function () {
    this.addDays(-1);
}

Date.prototype.addDays = function (count) {
    this.setDate(this.getDate() + count);
}

Date.prototype.equals = function (date) {
    return this.getDate() == date.getDate() && this.getMonth() == date.getMonth() && this.getFullYear() == date.getFullYear();
}

Date.prototype.daysTo = function (date) {
    let utc0 = Date.UTC(this.getFullYear(), this.getMonth(), this.getDate());
    let utc1 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

    return Math.floor((utc1 - utc0) / Date.MS_PER_DAY);
}

Date.prototype.getWeekOfYear = function(){
    let d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
    let dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    let yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return [d.getUTCFullYear(), Math.ceil((((d - yearStart) / 86400000) + 1)/7)];
};

Date.MS_PER_DAY = 1000 * 60 * 60 * 24;