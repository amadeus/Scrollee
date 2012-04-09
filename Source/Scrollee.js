/*
---

description: Scrollee

license: MIT-style

authors:
- Amadeus Demarzi (http://kiip.me/)

...
*/

(function(){

// Private API
var Internal = {

	// Reference to the last known document.scrollTop
	lastTop: 0,

	// Reference to the scrollEnd timeout
	timer: null,

	// Current status/direction of scroll
	status: 'stopped',

	// Timeout to detect stopped status
	scrollEndDelay: 200,

	// Scroll events emitter
	Events: new Events(),

	// Fired on window scroll, detects scroll direction, fires scroll event, and sets up scrollEnd timer
	handleScroll: function(e){
		// body.scrollTop works in good browsers, documentElement.scrollTop works in IE. Go figure.
		var top = document.body.scrollTop || document.documentElement.scrollTop,
			lTop = Internal.lastTop;

		Internal.status = (top < lTop) ? 'up' : (top > lTop) ? 'down' : Internal.status;
		Internal.Events.fireEvent('scroll', [Internal.status, top]);

		clearTimeout(Internal.timer);
		Internal.timer = setTimeout(Internal.handleScrollEnd, Internal.scrollEndDelay);
		Internal.lastTop = top;
	},

	// Force scroll end - after scrollEndDelay timeout
	handleScrollEnd: function(){
		var top = document.body.scrollTop || document.documentElement.scrollTop;
		Internal.status = 'stopped';
		Internal.Events.fireEvent('scroll', [Internal.status, top]);
		Internal.Events.fireEvent('scrollEnd', [Internal.status, top]);
	}
};

// Public API
var Scrollee = window.Scrollee = ({

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
		window.addEvent('scroll', Internal.handleScroll);
	},

	// Disable Scrollee functionality
	disable: function(){
		window.removeEvent('scroll', Internal.handleScroll);
	},

	// Aliases to internal event method (Internal.Events)
	addEvent: function(evt, fn){
		Internal.Events.addEvent(evt, fn);
		return this;
	},

	addEvents: function(obj){
		Internal.Events.addEvents(obj);
		return this;
	},

	removeEvent: function(evt, fn){
		Internal.Events.removeEvent(evt, fn);
		return this;
	},

	removeEvents: function(obj){
		Internal.Events.removeEvents(obj);
		return this;
	}
});

})();
