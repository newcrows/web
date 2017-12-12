/* A ViewPager implementation in JS
NOTE: Works on touch-devices and desktop

Copy this to your .css(
    .vp-container {
        position: relative;
    }

    .vp-page {
        position: absolute;
        top: 0;
        left: 0;

        width: 100%;
        height: 100%;

        box-sizing: border-box;

        transition: transform 0.4s ease;
    }
    
    .no-transition {
        transition: none;
    }
)

Constructor(
    container               : HTMLElement                       : Element that will act as ViewPager, needs height set
    [bounds]                : Number[2]                         : The left and right index bounds, inclusive
    [onBindCallback]        : Function(HTMLElement, Number)     : Called when {page} needs content for {index}
    [onClickCallback]       : Function(Event)                   : Click Event adjusted to work with ViewPager
    [onChangeCallback]      : Function(Number)                  : Called when {index} changed
    [onBeforeChangeCallback]: Function(Number)                  : Called before {index} changes
)

Functions(
    notifyBind(Number)  : Call to trigger onBindCallback if page at {index} is loaded
    next()              : Call to trigger snap to the next page, if not out of bounds
    previous()          : Call to trigger snap to the previous page, if not out of bounds

    setBounds(Number[2]): Set the left and right bounds, inclusive. This rebinds all loaded pages
    getBounds()         : Return this pager's current bounds

    setIndex(Number)    : Set the current index. This rebinds all loaded pages at new index
    getIndex()          : Get this pager's current index

    getPages()          : Return this pager's underlying pages

    setTemplate(Element): Set the {template} this pager uses to render pages. This rebinds all loaded pages
    getTemplate()       : Return this pager's current template to render pages
)

SideEffects(
    1) Declared {container} is cleared after first call to setTemplate(..)
    2) This uses the external methods:
            vpOnClickDelegate(e),
            vpOnSwipeStart(e),
            vpOnSwipeMove(e),
            vpOnSwipeEnd(e),
            vpTouchStart(e),
            vpTouchMove(e),
            vpTouchEnd(e)
    3) Declares following constants:
            TOUCH_SLOP,
            SNAP_TRESHOLD
    4) Uses CSS-classes:
            .vp-container,
            .vp-page,
            .no-transition

    No other side effects.
)

*/

//values for swipe and click handling
let TOUCH_SLOP = 30;
let SNAP_TRESHOLD = 80;

function ViewPager(container, bounds, onBindCallback, onClickCallback, onChangeCallback, onBeforeChangeCallback) {
    this.container = container;
    container.classList.add("vp-container");

    //pagination state
    this.bounds = bounds;   //get / set
    this.index = 0;         //get / set

    //backing elements
    this.pages = null;      //get only
    this.template = null;   //get / set  

    //swipe state
    this.isSwiping = false;
    this.isOverSlop = false;
    this.swipeX = 0;
    this.swipeDX = 0;

    /* LISTENERS */
    container.addEventListener("click", vpOnClickDelegate.bind(this));
    container.addEventListener("mousedown", vpOnSwipeStart.bind(this));
    container.addEventListener("mousemove", vpOnSwipeMove.bind(this));
    container.addEventListener("mouseup", vpOnSwipeEnd.bind(this));
    container.addEventListener("touchstart", vpTouchStart.bind(this));
    container.addEventListener("touchmove", vpTouchMove.bind(this));
    container.addEventListener("touchend", vpTouchEnd.bind(this));

    /* CALLBACKS */
    this.onBind = onBindCallback ? onBindCallback :  function(page, index) {
        console.log("onBind => " + page.className + ":" + index);
    };
    this.onClick = onClickCallback ? onClickCallback : function(e) {
        console.log("onClick => " + e.target);
    };
    this.onChange = onChangeCallback ? onChangeCallback : function(newIndex) {
        console.log("onChange => " + newIndex);
    };
    this.onBeforeChange = onBeforeChangeCallback ? onBeforeChangeCallback : function(oldIndex) {
        console.log("onBeforeChange => " + oldIndex);
    };

    /* TRIGGERS */
    //notify that page at index needs rebind (because backing data changed)
    this.notifyBind = function(index) {
        //which page corresponds to passed index at the moment
        var which = index - this.index;
        
        //if page at index not loaded currently, skip binding
        if (Math.abs(which) > 1)
            return;
        
        //invoke callback delegate
        this.onBindInternal(this.pages[which], index);
    }

    //attempt to go one page forward
    this.next = function() {
        this.snap(1);
    }

    //attempt to go one page backward
    this.previous = function() {
        this.snap(-1);
    }

    /* GETTERS / SETTERS */
    this.setBounds = function(bounds) {
        this.bounds = bounds;

        this.setIndexInternal(this.index);
    }

    this.getBounds = function() {
        return this.bounds;
    }

    this.setIndex = function(index) {
        this.setIndexInternal(index);
    }

    this.getIndex = function() {
        return this.index;
    }

    this.getPages = function() {
        return this.pages;
    }

    this.setTemplate = function(template) {
        this.template = template;   //store template
        this.createFromTemplate();  //create pages from stored template
        this.bindAll();             //(re-)bind all pages
        this.resetTranslate();      //reset all pages transform from -100% to 0% to +100%
    }

    this.getTemplate = function() {
        return this.template;
    }

    /* IMPLEMENTATION DETAIL */

    //bound-enforced setIndex(..)
    this.setIndexInternal = function(index) {
        //if not in bounds, clip to bounds
        if (!this.isInBounds(index)) {
            index = index < bounds[0] ? bounds[0] : bounds[1];
        }
        this.index = index;

        //reload pages
        this.bindAll();
    }

    //create pages from stored template (clone template three times)
    this.createFromTemplate = function() {
        this.pages = [];
        this.container.innerHTML = "";
        for (var c = -1; c < 2; c++) {
            var page = this.template.cloneNode(true);
            page.classList.add("vp-page");

            this.pages[c] = page;
            this.container.appendChild(page);
        }
    }

    //request bind for all pages
    this.bindAll = function() {
        for (var c = -1; c < 2; c++)
            this.onBindInternal(this.pages[c], this.index + c);
    }

    //reset translation of all pages to default (from -100% to 0% to +100%)
    this.resetTranslate = function() {
        for (var c = -1; c < 2; c++)
            this.translate(this.pages[c], c*100, 0);
    }

    //translate the page passed as arg by percent and px-offset
    this.translate = function(page, percent, px) {
        page.style.transform = "translate(calc(" + percent + "% + " + px + "px))";
    }

    //snap to a direction
    this.snap = function(dir) {
        //enforce bounds
        if (!this.isInBounds(this.index + dir))
            return;

        //grab pages array
        var pages = this.pages;

        //set correct visibility for pages
        for (var c = -1; c < 2; c++)
            this.visible(pages[c], c != -dir || c == 0);

        //reorder pages
        var hold = pages[0];
        pages[0] = pages[dir];
        pages[dir] = pages[-dir];
        pages[-dir] = hold;

        //notify callback with old index
        this.onBeforeChange(this.index);

        //adjust index
        this.index += dir;

        //check if index changed
        if (dir != 0) {
            //call on bind delegate
            this.onBindInternal(pages[dir], this.index + dir);

            //notify callback with new index
            this.onChange(this.index);
        }

        //reset translation of all pages to default (this is the snap animation)
        this.resetTranslate();
    }

    //onBind delegate, to check bounds before notifying callback
    this.onBindInternal = function(page, index) {
        //enforce bounds
        if (!this.isInBounds(index))
            return;

        //notify page bind callback
        this.onBind(page, index);
    }

    //check if passed index is inside of bounds
    this.isInBounds = function(index) {
        //no bounds set, virtually infinite
        if (!this.bounds)
            return true;

        //return is in bounds
        return index >= this.bounds[0] && index <= this.bounds[1];
    }

    //set the passed pages visibility (opacity)
    this.visible = function(page, visible) {
        page.style.opacity = visible ? "1" : "0";
    }
}

//click delegate that decides if click callback will be invoked, based on TOUCH_SLOP
function vpOnClickDelegate(e) {
    //only invoke callback when not snapping pages
    if (!this.isOverSlop)
        this.onClick(e);
}

//swipe start
function vpOnSwipeStart(e) {
    //check is already swiping
    if (this.isSwiping)
        return;

    //init swipe variables
    this.swipeX = e.clientX;
    this.swipeDX = 0;

    for (var c = -1; c < 2; c++) {
        //remove transition animation
        this.pages[c].classList.add("no-transition");

        //make all pages visible, for swiping purposes
        this.visible(this.pages[c], true);
    }

    //set isSwiping flag
    this.isSwiping = true;

    //clear isOverSlop flag
    this.isOverSlop = false;
}

//swipe move
function vpOnSwipeMove(e) {
    //if not swiping, return
    if (!this.isSwiping)
        return;

    //how much was swiped
    var dx = e.clientX - this.swipeX;
    this.swipeDX = dx;

    //check is over TOUCH_SLOP
    if (!this.isOverSlop && Math.abs(dx) > TOUCH_SLOP) {
        //set flag
        this.isOverSlop = true;

        //notify callback that index might change [pass old index]
        this.onBeforeChange(this.index);
    }

    //decide wether page can swipe or would swipe out of bounds
    if (!this.isOverSlop || dx > 0 && this.index == this.bounds[0] || dx < 0 && this.index == this.bounds[1])
        return;

    //set page translate values
    for (var c = -1; c < 2; c++)
        this.translate(this.pages[c], c * 100, this.swipeDX);
}

//swipe end
function vpOnSwipeEnd(e) {
    var dx = this.swipeDX;

    //enable transition animations
    for (var c = -1; c < 2; c++)
        this.pages[c].classList.remove("no-transition");

    //decide wether to snap
    if (dx < -SNAP_TRESHOLD)
        this.snap(1);
    else if (dx > SNAP_TRESHOLD)
        this.snap(-1);
    else if (this.isOverSlop)
        this.snap(0);

    //release isSwiping flag
    this.isSwiping = false;
}

//touch delegate to swipe
function vpTouchStart(e) {
    e.clientX = e.changedTouches[0].clientX;
    vpOnSwipeStart.call(this, e);
}

//touch delegate to swipe
function vpTouchMove(e) {
    e.clientX = e.changedTouches[0].clientX;
    vpOnSwipeMove.call(this, e);
}

//touch delegate to swipe
function vpTouchEnd(e) {
    e.clientX = e.changedTouches[0].clientX;
    vpOnSwipeEnd.call(this, e);
}