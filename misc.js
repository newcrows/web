function noop() {

}

function noop_true() {
    return true;
}

function newDiv(className) {
    return newElement("DIV",className);
}

function newElement(tag, className) {
    var ele = document.createElement(tag);
    if (className)
        ele.className = className;

    return ele;
}

function marginHeight(ele) {
    var eleHeight, eleMargin;
    if(document.all) {// IE
        eleHeight = ele.currentStyle.height;
        eleMargin = parseInt(ele.currentStyle.marginTop, 10) + parseInt(ele.currentStyle.marginBottom, 10);
    } else {// Mozilla
        eleHeight = document.defaultView.getComputedStyle(ele, '').getPropertyValue('height');
        eleMargin = parseInt(document.defaultView.getComputedStyle(ele, '').getPropertyValue('margin-top')) + parseInt(document.defaultView.getComputedStyle(ele, '').getPropertyValue('margin-bottom'));
    }
    return (parseInt(eleHeight.split("px")[0])+eleMargin);
}

function containsClass(element, classes) {        
    var classList = element.classList;
    for (var c = 0; c < classes.length; c++)
        if (classList.contains(classes[c]))
            return true;

    return false;
}

function findTraverseUp(element, classes) {
    while (element) {
        if (containsClass(element, classes))
            return element;

        element = element.parentElement;
    }

    return null;
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