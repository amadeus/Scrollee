/*
---

description: Scrollee

license: MIT-style

authors:
- Amadeus Demarzi (http://kiip.me/)

...
*/

(function(exports){ 'use strict';

var Internal, Scrollee;

// Private API
Internal = {

	// Reference to the last known document.scrollTop
	lastTop: 0,

	// Reference to the scrollEnd timeout
	timer: null,

	// Current status/direction of scroll
	status: 'stopped',

	// Timeout to detect stopped status
	scrollEndDelay: 200,

	__events: {},

	fireEvents: function(event, status, top){
		var i, eLen;
		if (!this.__events[event]) {
			return;
		}

		for (i = 0, eLen = this.__events[event].length; i < eLen; i++) {
			this.__events[event][i](status, top);
		}
	},

	addEvent: function(event, func){
		if (!this.__events[event]) {
			this.__events[event] = [];
		}
		this.__events[event].push(func);
	},

	removeEvent: function(event, func){
		var index;
		if (!this.__events[event]) {
			return;
		}

		index = this.__events[event].indexOf(func);

		if (index < 0) {
			return;
		}
		this.__events[event].splice(index, 1);
	},

	// Fired on window scroll, detects scroll direction, fires scroll event, and sets up scrollEnd timer
	handleScroll: function(){
		// body.scrollTop works in good browsers, documentElement.scrollTop works in IE. Go figure.
		var top = document.body.scrollTop || document.documentElement.scrollTop,
			lTop = Internal.lastTop;

		Internal.status = (top < lTop) ? 'up' : (top > lTop) ? 'down' : Internal.status;
		Internal.fireEvents('scroll', Internal.status, top);

		clearTimeout(Internal.timer);
		Internal.timer = setTimeout(Internal.handleScrollEnd, Internal.scrollEndDelay);
		Internal.lastTop = top;
	},

	// Force scroll end - after scrollEndDelay timeout
	handleScrollEnd: function(){
		var top = document.body.scrollTop || document.documentElement.scrollTop;
		Internal.status = 'stopped';
		Internal.fireEvents('scroll',    Internal.status, top);
		Internal.fireEvents('scrollEnd', Internal.status, top);
	}
};

// Public API
Scrollee = exports.Scrollee = ({

	// Sets internal scrollEndDelay
	setScrollEndDelay: function(delay){
		Internal.scrollEndDelay = delay;
		return this;
	},

	getScroll: function(){
		return document.body.scrollTop || document.documentElement.scrollTop;
	},

	// Public method to get scroll status arbitrarily since it's protected
	getStatus: function(){
		return Internal.status;
	},

	// Enable Scrollee functionality
	enable: function(){
		// Using vanilla JS for extra performance...
		if (exports.addEventListener) {
			exports.addEventListener('scroll', Internal.handleScroll, false);
		} else {
			exports.attachEvent('scroll', Internal.handleScroll);
		}
		return this;
	},

	// Disable Scrollee functionality
	disable: function(){
		// Using vanilla JS for extra perf
		if (exports.removeEventListener) {
			exports.removeEventListener('scroll', Internal.handleScroll, false);
		} else {
			exports.detachEvent('scroll', Internal.handleScroll);
		}
		return this;
	},

	// Aliases to internal event method (Internal)
	addEvent: function(evt, fn){
		Internal.addEvent(evt, fn);
		return this;
	},

	addEvents: function(obj){
		Object.each(obj, function(func, event){
			Internal.addEvent(event, func);
		});
		return this;
	},

	removeEvent: function(evt, fn){
		Internal.removeEvent(evt, fn);
		return this;
	},

	removeEvents: function(obj){
		// If just a string is passed in, we clear all events of a
		// particular type
		if (typeOf(obj) === 'string') {
			Internal.__events[obj] = [];
			return this;
		}
		Object.each(obj, function(func, event){
			Internal.removeEvent(event, func);
		});
		return this;
	}
});

Scrollee.Fixed = new Class({

	Implements: [Options, Events],

	options: {
		// Offset for bottom and top of container
		topOffset    : 0,
		bottomOffset : 0,

		// Offset for window
		windowTopOffset    : 0,
		windowBottomOffset : 0,

		// Determine whether class attaches on initialization or not
		autoAttach: true,

		fixedStyle: {
			position : 'fixed'
		},

		absoluteStyle: {
			position : 'absolute'
		}
	},

	references: {
		containerTop    : 0,
		containerBottom : 0,
		containerHeight : 0,

		elementTop    : 0,
		elementHeight : 0,

		windowHeight     : 0,
		windowScrollSize : 0
	},

	status: 'detached',
	positioning: 'init',

	initialize: function(element, container, options){
		this.element   = document.id(element);
		this.container = document.id(container);
		this.setOptions(options);
		if (!this.element) {
			throw new Error('Scrollee.Fixed: No valid element or container specified, ' + element + ', ' + container);
		}

		// Get element parent reference
		this.elParent = this.element.getParent();

		// Create a wrapper element for positioning
		this.wrapper = new Element('div', {
			styles: this.options.absoluteStyle
		});

		// Prebind events
		this._handleScroll = this._handleScroll.bind(this);
		this.updateInfo    = this.updateInfo.bind(this);

		if (this.options.autoAttach) {
			this.attach();
		}
	},

	// Attach event handlers and update info
	attach: function(){
		if (this.status !== 'detached') {
			return;
		}

		this.status = 'stopped';

		Internal.addEvent('scroll', this._handleScroll);
		exports.addEvent('resize',  this.updateInfo);

		this.updateInfo();

		return this;
	},

	detach: function(){
		if (this.status === 'detached') return;

		this.element.inject(this.elParent);
		this.wrapper.dispose();
		this.status = 'detached';

		Internal.removeEvent('scroll', this._handleScroll);
		exports.removeEvent('resize',  this.updateInfo);

		return this;
	},

	updateInfo: function(){
		var ref      = this.references,
			opts     = this.options,
			eInfo    = this.element.getCoordinates(this.container),
			cInfo    = this.container.getCoordinates(document.body),
			wInfo    = exports.getSize(),
			elHeight = eInfo.height,
			cHeight  = cInfo.height - opts.topOffset - opts.bottomOffset,
			styles   = {};

		ref.elementTop    = eInfo.top;
		ref.elementHeight = eInfo.height;

		ref.containerTop    = cInfo.top;
		ref.containerBottom = cInfo.bottom;
		ref.containerHeight = cInfo.height;

		ref.windowHeight     = wInfo.y;
		ref.windowScrollSize = exports.getScrollSize().y - ref.windowHeight;

		// Determine if menu is larger than window
		if (elHeight < wInfo.y - opts.windowTopOffset - opts.windowBottomOffset) {
			opts.fixed = true;
		} else {
			opts.fixed = false;
		}

		// Determines whether class is even needed
		if (elHeight < cHeight) {
			this.wrapper.adopt(this.element).inject(this.container);

			Object.merge(styles, opts.absoluteStyle);
			styles.height = ref.elementHeight;

			this.wrapper.setStyles(styles)
				.adopt(this.element)
				.inject(this.container);

			this._positionAbsolutely(Scrollee.getScroll());
		}
		// Disable class, since there's no need for a scroll
		else {
			this.detach();
		}

		return this;
	},

	_handleScroll: function(direction, position){
		// Safety check
		if (this.status === 'detached') return;

		// Fix bounce issues
		position = (position < 0) ? 0 : (position > this.references.windowScrollSize) ? this.references.windowScrollSize : position;

		// Executed if element is smaller than window height
		if (this.options.fixed) {
			return this._handleFixed(direction, position);
		}

		// Only executed if element is larger than window and needs special fixed scrolling properties
		if (direction === 'up') {
			if (this.status === 'down') {
				this._positionAbsolutely();
			}
			return this._handleUp(direction, position);
		}
		if (direction === 'down') {
			if (this.status === 'up'){
				this._positionAbsolutely();
			}
			return this._handleDown(direction, position);
		}
	},

	_handleFixed: function(direction, position){
		var ref = this.references,
			opts = this.options,
			scrollTop = position + opts.windowTopOffset,
			scrollBottom = scrollTop + ref.elementHeight,
			containerBottom = ref.containerBottom - opts.bottomOffset,
			containerTop = ref.containerTop + opts.topOffset,
			styles = { bottom: 'auto' };

		this.status = direction;

		// If we are outside the bounds of the container
		if (scrollBottom >= containerBottom || scrollTop <= containerTop) {
			if (this.positioning !== 'absolute')
				return this._positionAbsolutely();
			return;
		}

		// Otherwise we must ensure we are fixed
		if (this.positioning !== 'fixed') {
			this.positioning = 'fixed';

			Object.merge(styles, opts.fixedStyle);
			styles.top = opts.windowTopOffset;

			this.wrapper.setStyles(styles);
		}
	},

	_handleUp: function(direction, position){
		var ref = this.references,
			opts = this.options,
			scrollTop = position - opts.topOffset + opts.windowTopOffset,
			containerBottom = ref.containerBottom - ref.windowHeight + opts.bottomOffset,
			containerTop = ref.containerTop - opts.topOffset,
			styles = { bottom: 'auto' },
			wrapperTop;

		this.status = 'up';

		// If we are outside the bounds of the container
		if (scrollTop > containerBottom || scrollTop <= (containerTop + opts.topOffset)) {
			if (this.positioning !== 'absolute'){
				return this._positionAbsolutely();
			}
			return;
		}

		// Otherwise we must ensure we are fixed
		if (this.positioning !== 'fixed') {
			wrapperTop = containerTop + this.wrapper.getCoordinates(this.container).top;

			Object.merge(styles, opts.fixedStyle);
			styles.top = opts.windowTopOffset;

			if (scrollTop <= wrapperTop){
				this.positioning = 'fixed';
				this.wrapper.setStyles(styles);
			}

		}
	},

	_handleDown: function(direction, position){
		var ref = this.references,
			opts = this.options,
			scrollBottom = position + ref.windowHeight,
			containerBottom = ref.containerBottom + opts.windowBottomOffset,
			containerTop = ref.containerTop + ref.windowHeight,
			styles = { top: 'auto' },
			wrapperBottom;

		this.status = 'down';

		// After container
		if (scrollBottom >= (containerBottom - opts.bottomOffset) || scrollBottom <= containerTop){
			if (this.positioning !== 'absolute'){
				return this._positionAbsolutely(position);
			}
			return;
		}

		if (this.positioning !== 'fixed'){
			wrapperBottom = ref.containerTop + this.wrapper.getCoordinates(this.container).bottom + this.options.windowBottomOffset;

			if (scrollBottom >= wrapperBottom){
				this.positioning = 'fixed';

				Object.merge(styles, opts.fixedStyle);
				styles.bottom = opts.windowBottomOffset;

				this.wrapper.setStyles(styles);
			}
		}
	},

	_positionAbsolutely: function(position){
		var top = 0,
			ref = this.references,
			opts = this.options,
			maxTop = ref.containerBottom - ref.containerTop - ref.elementHeight - opts.bottomOffset,
			styles = { bottom: 'auto' };

		position = (position || position === 0) ? position + opts.windowTopOffset : this.element.getCoordinates(document.body).top;

		top = position - ref.containerTop;

		if (top < opts.topOffset)
			top = opts.topOffset;
		if (top > maxTop)
			top = maxTop;

		Object.merge(styles, opts.absoluteStyle);
		styles.top = top;

		this.wrapper.setStyles(styles);

		this.positioning = 'absolute';
	}

});

})(window);
