/* A VIEWPAGER FOR JS
    Requires following .css classes:
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

            overflow: hidden;

            transition: transform 0.4s ease;
            will-change: transform, opacity;
        }

        .no-transition {
            transition: none;
        }

    HOW TO USE:
        just create a new ViewPager object and pass the element containing your pages, i.E.:

        var myViewPager = new ViewPager(document.querySelector("#my-viewpager"));

        that's it. Now you have a working viewpager. By default, all direct children of #my-viewpager are converted to pages automatically. Example mark-up:
        
        <div id="my-viewpager">
            <div style="height: 200px">
                <p>I will be a page in myViewPager!</p>
            </div>
            <div>
                <p>I will also be a page in myViewPager!</p>
            </div>
            <div>
                <p>A third page in myViewPager!</p>
                <p>Also part of the third page in myViewPager, because i am not a direct child of #my-viewpager!</p>
            </div>
        </div>


        infinite pagination? easy:

        var myViewPager = new ViewPager(document.querySelector("#my-viewpager"), true);

        just pass [rollAround = true] to the constructor, as second argument.
        NOTE: for infinite pagination, at least 3 pages have to exist


        infinite pagination with dynamic content (i.E. a calendar or infinite list or whatever)? also easy:
        
        leave the container element empty. i.E in mark-up:
        
        <div id="my-viewpager" style="height: 400px"></div>
        
        create the viewpager object
        
        var myViewPager = new ViewPager(document.querySelector("#my.viewpager"));

        override the callbacks:
    
            onCreate(page)
            onBind(page, index)

        and then set a template, for example an empty div.
        
            myViewPager.setTemplate(newDiv());

        the template is copied three times, each time followed by a call to onCreate(page) so you can attach whatever you like to the DOM of the template, like id's or new elements or whatever. i.E:
        
            myViewPager.onCreate = function(page) {
                page.appendChild(newDiv("my-awesome-css-class"))
            }

        every time the viewpager needs to render a page, onBind(page, index) is called, with the index for the page that needs rendering, just fill your visible content to the page in that call. i.E:
        
            myViewPager.onBind = function(page, index) {
                page.innerText = "I am page numbero " + index;
            }
            
        that's it.
        
        finally, you want to listen to index changes, or clicks?
        
        override the callbacks:
        
            onChange(index)
            onClick(event)
            
        every time the index changes (i.E. someone swiped a page forward, backward, whatever) onChange(index) is called with the new index:
        
            myViewPager.onChange = function(index) {
                console.log("myViewPager changed the current index to " + index);
            }
            
        every time a page is clicked, but NOT swiped to the side, onClick is called. This is so that you can swipe without firing click events non-stop
        
            myViewPager.onClick = function(event) {
                console.log("myViewPager was clicked, but did NOT swipe or change current index.");
            }
            
        to programmatically change index, call one of:
        
            next()
            previous()
            setIndex(index)
        
        i.E.:   myViewPager.next() will go to the next page (page from the right side), if it is not out of bounds
        
        some closing NOTES:
            if the viewpager element has children in markup, the first child's height is used as viewpager height, unless explicitly styled otherwise.
            
            the viewpager gets his width fixed to % of parent element width it had at document load, unless explicitly styled otherwise.
            
            you can reload all pages anytime by calling myViewPager.rebindAll();
            
            you can request a specific page to reload, if it is currently loaded, by calling myViewPager.requestBind(index); This only works when [rollAround = false]
            
            you can change the bounds (inclusive) any time by calling myViewPager.setBounds([min, max]);
            
            you can disable swiping by calling myViewPager.setCanSwipe(false); This also disables changing pages programmatically.
            
            some getters:
                getIndex();
                getBounds();
                getPages();
                getPageIfLoaded(index); Only works when [rollAround = false]
                getCanSwipe();
                getTemplate();  Only works in dynamic infinite mode
*/

//values for swipe and click handling
let TOUCH_SLOP = 30;
let SNAP_TRESHOLD = 80;

//value for roll around, if page_count * ROLL_AROUND is bigger than Number.MAX_VALUE, lower ROLL_AROUND accordingly
let ROLL_AROUND = 65536;

function ViewPager(container, rollAround, bounds, canSwipe) {
    this.container = container;
    container.classList.add("vp-container");

    //initial width
    this.pageWidth = container.offsetWidth;

    //pagination state
    this.bounds = bounds;   //get / set
    this.index = 0;         //get / set
    this.rollAround = rollAround;

    //backing elements
    this.pages = null;      //get only
    this.template = null;   //get / set

    //if container has child elements, convert them to pages the default binder can display
    this.convertedChildren = null;
    this.convertChildren();

    //swipe state
    this.canSwipe = canSwipe == null ? true : canSwipe;
    this.isSwiping = false;
    this.isOverSlop = false;
    this.swipeX = 0;
    this.swipeDX = 0;

    //pagination gesture handlers
    container.addEventListener("click", this.onClickDelegate.bind(this));
    container.addEventListener("mousedown", this.onSwipeStart.bind(this));
    container.addEventListener("mousemove", this.onSwipeMove.bind(this));
    container.addEventListener("mouseup", this.onSwipeEnd.bind(this));
    container.addEventListener("touchstart", this.touchStart.bind(this));
    container.addEventListener("touchmove", this.touchMove.bind(this));
    container.addEventListener("touchend", this.touchEnd.bind(this));

    //resize handler
    window.addEventListener("resize", function(e) {
        this.pageWidth = container.offsetWidth;
        this.resetTranslate();
    }.bind(this));
}

ViewPager.prototype.onCreate = noop;

ViewPager.prototype.onBind = function(page, index) {
    //if no converted children, bail
    if (!this.convertedChildren)
        return;

    //clear page's content
    page.innerText = "";  

    //adjust index if rollAround
    var idx = this.rollAround ? index % this.convertedChildren.length : index;

    if (idx < 0) {
        //if index < 0, set high index again, rebinding all
        this.setIndex(this.convertedChildren.length * ROLL_AROUND);
    } else {
        //append converted child for index
        page.appendChild(this.convertedChildren[idx]);
    }
}

ViewPager.prototype.onChange = noop;

ViewPager.prototype.onClick = noop;

ViewPager.prototype.convertChildren = function() {
    //grab container
    var container = this.container;

    //grab container's child elements
    var children = container.children;

    //if no child elements, return
    if (!children || children.length == 0)
        return;

    //save children internally
    this.convertedChildren = [...children];

    //grab parent element
    var parent = container.parentElement;

    //auto-set container width as percentage of parent, if not specified explicitly
    if (!container.style.width)
        container.style.width = (container.offsetWidth / parent.offsetWidth) * 100 + "%";

    //auto-set container height as px-height of first child at page-load, if not specified explicitly
    if (!container.style.height)
        container.style.height = marginHeight(children[0]) + "px";

    //set bounds directly according to child-count, if !rollAround
    if (!this.rollAround)
        this.bounds = [0, children.length-1];
    //if rollAround, start at a very high index for quasi infinite pagination
    else if (children.length > 2)
        this.index = children.length * ROLL_AROUND;
    //if rollAround, but not enough children, disable rollAround and log error
    else {
        this.rollAround = false;  
        this.bounds = [0, children.length-1];

        console.error("rollAround = true requires at least 3 pages, disabling rollAround..")
    }

    //set empty div as template to kick off pager
    this.setTemplate(newDiv());
}

ViewPager.prototype.requestBind = function(index) {
    var page = this.getPageIfLoaded(index);

    //if page not currently loaded, return
    if (!page)
        return;

    //invoke callback delegate
    this.onBindInternal(page, index);
}

ViewPager.prototype.next = function() {
    this.snap(1);
}

ViewPager.prototype.previous = function() {
    this.snap(-1);
}

ViewPager.prototype.rebindAll = function() {
    for (var c = -1; c < 2; c++)
        this.onBindInternal(this.pages[c], this.index + c);
}

ViewPager.prototype.setBounds = function(bounds) {
    this.bounds = bounds;

    this.setIndexInternal(this.index);
}

ViewPager.prototype.getBounds = function() {
    return this.bounds;
}

ViewPager.prototype.setIndex = function(index, noReload) {
    this.setIndexInternal(index, noReload);
}

ViewPager.prototype.getIndex = function() {
    return this.index;
}

ViewPager.prototype.getPages = function() {
    return this.pages;
}

ViewPager.prototype.getPageIfLoaded = function(index) {
    var which = index - this.index;

    if (Math.abs(which) > 1)
        return null;

    return this.pages[which];
}

ViewPager.prototype.setCanSwipe = function(canSwipe) {        
    this.canSwipe = canSwipe;
}

ViewPager.prototype.getCanSwipe = function() {
    return this.canSwipe;
}

ViewPager.prototype.setTemplate = function(template) {
    this.template = template;   //store template
    this.createFromTemplate();  //create pages from stored template
    this.rebindAll();           //(re-)bind all pages
    this.resetTranslate();      //reset all pages transform from -100% to 0% to +100%
}

ViewPager.prototype.getTemplate = function() {
    return this.template;
}

ViewPager.prototype.setIndexInternal = function(index, noReload) {
    //if not in bounds, clip to bounds
    if (!this.isInBounds(index)) {
        index = index < bounds[0] ? bounds[0] : bounds[1];
    }
    this.index = index;

    //reload pages
    if (!noReload) {
        this.onChange(this.index);  //notify index changed
        this.rebindAll();
    }
}

ViewPager.prototype.createFromTemplate = function() {
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

ViewPager.prototype.resetTranslate = function() {
    for (var c = -1; c < 2; c++)
        this.translate(this.pages[c], 0, c * this.pageWidth);
}

ViewPager.prototype.translate = function(page, percent, px) {
    page.style.transform = "translate(" + px + "px)";
}

ViewPager.prototype.snap = function(dir) {
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

ViewPager.prototype.onBindInternal = function(page, index) {
    //enforce bounds
    if (!this.isInBounds(index))
        return;

    //notify page bind callback
    this.onBind(page, index);
}

ViewPager.prototype.isInBounds = function(index) {
    //no bounds set, virtually infinite
    if (!this.bounds)
        return true;

    //return is in bounds
    return index >= this.bounds[0] && index <= this.bounds[1];
}

ViewPager.prototype.visible = function(page, visible) {
    page.style.opacity = visible ? "1" : "0";
}

ViewPager.prototype.onClickDelegate =  function(e) {
    //only invoke callback when not snapping pages
    if (!this.isOverSlop)
        this.onClick(e);
}

ViewPager.prototype.onSwipeStart = function(e) {
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

ViewPager.prototype.onSwipeMove = function(e) {
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

ViewPager.prototype.onSwipeEnd = function(e) {
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

ViewPager.prototype.touchStart = function(e) {
    e.clientX = e.changedTouches[0].clientX;
    this.onSwipeStart(e);
}

ViewPager.prototype.touchMove = function(e) {
    e.clientX = e.changedTouches[0].clientX;
    this.onSwipeMove(e);
}

ViewPager.prototype.touchEnd = function(e) {
    e.clientX = e.changedTouches[0].clientX;
    this.onSwipeEnd(e);
}