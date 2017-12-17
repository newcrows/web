function toggleSide() {
    document.querySelector(".side").classList.toggle("in-view");
    document.querySelector(".over").classList.toggle("in-view");
}

function noop() {
    
}

function newDiv(className) {
    var div = document.createElement("div");
    div.className = className;
    
    return div;
}

function containsClass(element, classes) {
    var classList = element.classList;
    for (var c = 0; c < classes.length; c++)
        if (classList.contains(classes[c]))
            return true;

    return false;
}

var _isMobile;

addEventListener("load", onResizeCheck);
addEventListener("resize", onResizeCheck);

function isMobile() {
    return _isMobile;
}

function onResizeCheck() {
    var isM = window.innerWidth <= 768;
    if (_isMobile != isM) {
        _isMobile = isM;

        //fire dimension_changed event, except when onload (the initial document load)

        var e = new Event("dimension_changed");
        dispatchEvent(e);
    }
}