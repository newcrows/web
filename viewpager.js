//values for swipe and click handling
let TOUCH_SLOP = 30;
let SNAP_TRESHOLD = 80;

function ViewPager(container, bounds, canSwipe, onCreateCallback, onBindCallback, onChangeCallback, onClickCallback) {
    this.container = container;
    container.classList.add("vp-container");
    
    //initial width
    this.pageWidth = container.offsetWidth;

    //pagination state
    this.bounds = bounds;   //get / set
    this.index = 0;         //get / set

    //backing elements
    this.pages = null;      //get only
    this.template = null;   //get / set  

    //swipe state
    this.canSwipe = canSwipe == null ? true : canSwipe;
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
    window.addEventListener("resize", function(e) {
        this.pageWidth = container.offsetWidth;
        this.resetTranslate();
    }.bind(this));

    /* CALLBACKS */
    this.onCreate = onCreateCallback ? onCreateCallback : noop;
    
    this.onBind = onBindCallback ? onBindCallback : noop;
    
    this.onChange = onChangeCallback ? onChangeCallback : noop;
    
    this.onClick = onClickCallback ? onClickCallback : noop;
    
    /* TRIGGERS */
    //notify that page at index needs rebind (because backing data changed)
    this.notifyBind = function(index) {
        var page = this.getPageIfLoaded(index);
        
        //if page not currently loaded, return
        if (!page)
            return;

        //invoke callback delegate
        this.onBindInternal(page, index);
    }

    //attempt to go one page forward
    this.next = function() {
        this.snap(1);
    }

    //attempt to go one page backward
    this.previous = function() {
        this.snap(-1);
    }
    
    //request rebind for all pages
    this.rebindAll = function() {
        for (var c = -1; c < 2; c++)
            this.onBindInternal(this.pages[c], this.index + c);
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

    this.getPageIfLoaded = function(index) {
        var which = index - this.index;

        if (Math.abs(which) > 1)
            return null;

        return this.pages[which];
    }
    
    this.setCanSwipe = function(canSwipe) {        
        this.canSwipe = canSwipe;
    }
    
    this.getCanSwipe = function() {
        return this.canSwipe;
    }

    this.setTemplate = function(template) {
        this.template = template;   //store template
        this.createFromTemplate();  //create pages from stored template
        this.rebindAll();             //(re-)bind all pages
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
        
        this.onChange(this.index);  //notify index changed

        //reload pages
        this.rebindAll();
    }

    //create pages from stored template (clone template three times)
    this.createFromTemplate = function() {
        this.pages = [];
        this.container.innerHTML = "";
        for (var c = -1; c < 2; c++) {
            //clone template
            var page = this.template.cloneNode(true);
            page.classList.add("vp-page");
            
            //notify callback a page was created
            this.onCreate(page);

            //append new page
            this.pages[c] = page;
            this.container.appendChild(page);
        }
    }

    //reset translation of all pages to default (from -100% to 0% to +100%)
    this.resetTranslate = function() {
        for (var c = -1; c < 2; c++)
            //TESTING
            this.translate(this.pages[c], 0, c * this.pageWidth);
            //this.translate(this.pages[c], c*100, 0);
    }

    //translate the page passed as arg by percent and px-offset
    this.translate = function(page, percent, px) {
        page.style.transform = "translate(" + px + "px)";
    }

    //snap to a direction
    this.snap = function(dir) {
        //enforce bounds
        if (!this.isInBounds(this.index + dir))
            return;
        
        //check canSwipe flag and redirect to dir=0 if needed
        if (!this.canSwipe)
            dir = 0;

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
    //check is already swiping or swiping disabled
    if (this.isSwiping || !this.canSwipe)
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
    
    //check canSwipe flag and redirect dx, but continue to process swipe event, to manage internal state correctly
    if (!this.canSwipe)
        dx = 0;
    
    //update internal state
    this.swipeDX = dx;

    //check is over TOUCH_SLOP
    if (!this.isOverSlop && Math.abs(dx) > TOUCH_SLOP) {
        //set flag
        this.isOverSlop = true;
    }

    //decide wether page can swipe or would swipe out of bounds
    if (!this.isOverSlop || this.bounds && (dx > 0 && this.index == this.bounds[0] || dx < 0 && this.index == this.bounds[1]))
        return;

    //set page translate values
    for (var c = -1; c < 2; c++)
        this.translate(this.pages[c], 0, c * this.pageWidth + this.swipeDX);
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