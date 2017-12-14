//isMobile() state
var _isMobile;

/* LISTENERS */
addEventListener("load", onResizeCheck);
addEventListener("resize", onResizeCheck);

/* GENERIC CALLS */

//use to decide layout
function isMobile() {
    return _isMobile;
}

//create empty div with className
function newDiv(className) {
    var div = document.createElement("DIV");
    div.className = className;

    return div;
}

//toggle the sidebar
function toggleSide() {
    document.querySelector('.overlay').classList.toggle('show');
    document.querySelector('.sidebar').classList.toggle('show');
}

//traverse up the DOM till element with passed class found or no higher parent
function findTraverseUp(target, clazz) {
    while(target && !target.classList.contains(clazz)) {
        target = target.parentElement;
    }

    return target;
}

//do nothing
function noop() {

}

/* IMPLEMENTATION DETAIL */

//hook window events
function onResizeCheck() {
    var isM = window.innerWidth <= 768;
    if (_isMobile != isM) {
        _isMobile = isM;

        //fire dimension_changed event, except when onload (the initial document load)

        var e = new Event("dimension_changed");
        dispatchEvent(e);
    }
}