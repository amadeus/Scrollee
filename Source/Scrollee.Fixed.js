/*
---

description: Scrollee.Fixed

license: MIT-style

authors:
- Amadeus Demarzi (http://kiip.me/)

...
*/

(function(){

// Public API
window.Scrollee.Fixed = new Class({

	Implements: [Options, Events],

	options: {
		// Offset for bottom and top of container
		topOffset: 0,
		bottomOffset: 0,

		// Offset for window
		windowTopOffset: 0,
		windowBottomOffset: 0,

		// Determine whether class attaches on initialization or not
		autoAttach: true
	},

	references: {
		containerTop: 0,
		containerBottom: 0,
		containerHeight: 0,
		elementTop: 0,
		elementLeft: 0,
		elementFixedLeft: 0,
		elementHeight: 0,
		elementWidth: 0,
		windowWidth: 0,
		windowHeight: 0,
		windowScrollSize: 0
	},

	status: 'disabled',
	positioning: 'init',

	initialize: function(element, container, options){
		this.element = document.id(element);
		this.container = document.id(container);
		this.setOptions(options);
		if (!this.element)
			throw new Error('Scrollee.Fixed: No valid element or container specified, ' + element + ', ' + container);

		// Get element parent reference
		this.elParent = this.element.getParent();

		// Create a wrapper element for positioning
		this.wrapper = new Element('div', {
			styles: {
				position        : 'absolute',
				webkitTransform : 'translate3d(0,0,0)'
			}
		});

		// Prebind events
		this._handleScroll = this._handleScroll.bind(this);
		this.updateInfo = this.updateInfo.bind(this);

		if (this.options.autoAttach) this.attach();
	},

	// Attach event handlers and update info
	attach: function(){
		if (this.status !== 'disabled') return;
		this.status = 'stopped';

		Scrollee.addEvent('scroll', this._handleScroll);
		window.addEvent('resize', this.updateInfo);

		this.updateInfo();

		return this;
	},

	detach: function(){
		if (this.status === 'disabled') return;

		this.element.inject(this.elParent);
		this.wrapper.dispose();
		this.status = 'disabled';

		Scrollee.removeEvent('scroll', this._handleScroll);
		window.removeEvent('resize', this.updateInfo);

		return this;
	},

	updateInfo: function(){
		var eInfo    = this.element.getCoordinates(this.container),
			cInfo    = this.container.getCoordinates(document.body),
			wInfo    = window.getSize(),
			elHeight = eInfo.height,
			cHeight  = cInfo.height - this.options.topOffset - this.options.bottomOffset;

		this.references.elementTop       = eInfo.top;
		this.references.elementLeft      = eInfo.left;
		this.references.elementHeight    = eInfo.height;
		this.references.elementWidth     = eInfo.width;
		this.references.elementFixedLeft = this.elParent.getCoordinates(document.body).left;

		this.references.containerTop     = cInfo.top;
		this.references.containerBottom  = cInfo.bottom;
		this.references.containerHeight  = cInfo.height;

		this.references.windowWidth      = wInfo.x;
		this.references.windowHeight     = wInfo.y;
		this.references.windowScrollSize = window.getScrollSize().y - this.references.windowHeight;

		// Determine if menu is larger than window
		if (elHeight < wInfo.y - this.options.windowTopOffset - this.options.windowBottomOffset){
			this.options.fixed = true;
		} else {
			this.options.fixed = false;
		}

		// Determines whether class is even needed
		if (elHeight < cHeight){
			this.wrapper.adopt(this.element).inject(this.container);
			this.wrapper.setStyles({
			    position : 'absolute',
			    width    : this.references.elementWidth,
			    height   : this.references.elementHeight
			}).adopt(this.element).inject(this.container);
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
		if (this.status === 'disabled') return;

		// Fix bounce issues
		position = (position < 0) ? 0 : (position > this.references.windowScrollSize) ? this.references.windowScrollSize : position;

		if (direction === 'stopped'){
		    return this._handleStopped(direction, position);
		}
		if (this.options.fixed) {
			return this._handleFixed(direction, position);
		}
		if (direction === 'up'){
			if (this.status === 'down')
				this._positionAbsolutely(position);
		    return this._handleUp(direction, position);
		}
		if (direction === 'down'){
			if (this.status === 'up')
				this._positionAbsolutely(position);
			return this._handleDown(direction, position);
		}
	},

	_handleFixed: function(direction, position){
		var ref = this.references,
			opts = this.options,
			scrollTop = position + opts.windowTopOffset,
			scrollBottom = scrollTop + ref.elementHeight,
			containerBottom = ref.containerBottom - opts.bottomOffset,
			containerTop = ref.containerTop + opts.topOffset;

		this.status = direction;

		// If we are outside the bounds of the container
		if (scrollBottom >= containerBottom || scrollTop <= containerTop) {
			if (this.positioning !== 'absolute')
				return this._positionAbsolutely(position);
			return;
		}

		// Otherwise we must ensure we are fixed
		if (this.positioning !== 'fixed'){
			this.positioning = 'fixed';
			this.wrapper.setStyles({
				position: 'fixed',
				top: opts.windowTopOffset,
				left: ref.elementFixedLeft,
				bottom: 'auto'
			});
		}
	},

	_handleUp: function(direction, position){
		var ref = this.references,
			opts = this.options,
			scrollTop = position - opts.topOffset + opts.windowTopOffset,
			containerBottom = ref.containerBottom - ref.windowHeight,
			containerTop = ref.containerTop - opts.topOffset,
			wrapperTop;

		this.status = 'up';

		// If we are outside the bounds of the container
		if (scrollTop >= containerBottom || scrollTop <= containerTop){
			if (this.positioning !== 'absolute')
				return this._positionAbsolutely(position);
			return;
		}

		// Otherwise we must ensure we are fixed
		if (this.positioning !== 'fixed'){
			wrapperTop = containerTop + this.wrapper.getCoordinates(this.container).top;

			if (scrollTop <= wrapperTop){
				this.positioning = 'fixed';
				this.wrapper.setStyles({
				    position: 'fixed',
				    top: opts.windowTopOffset,
				    left: ref.elementFixedLeft,
				    bottom: 'auto'
				});
			}

		}
	},

	_handleDown: function(direction, position){
		var ref = this.references,
			opts = this.options,
			scrollBottom = position + ref.windowHeight,
			containerBottom = ref.containerBottom + opts.windowBottomOffset,
			containerTop = ref.containerTop + ref.windowHeight,
			wrapperBottom;

		this.status = 'down';

		// After container
		if (scrollBottom >= containerBottom || scrollBottom <= containerTop){
			if (this.positioning !== 'absolute')
				return this._positionAbsolutely(position);
			return;
		}

		if (this.positioning !== 'fixed'){
			wrapperBottom = ref.containerTop + this.wrapper.getCoordinates(this.container).bottom + this.options.windowBottomOffset;

			 if (scrollBottom >= wrapperBottom){
				this.positioning = 'fixed';
				this.wrapper.setStyles({
					position: 'fixed',
					top: 'auto',
					left: ref.elementFixedLeft,
					bottom: this.options.windowBottomOffset
				});
			}
		}
	},

	_handleStopped: function(direction, position){
		if (this.positioning === 'absolute') return this.status = 'stopped';
		this._positionAbsolutely(position);
		this.status = 'stopped';
	},

	_positionAbsolutely: function(position){
		if (this.positioning === 'absolute') return;

		var top = 0,
			ref = this.references,
			maxTop = ref.containerBottom - ref.containerTop - ref.elementHeight - this.options.bottomOffset;

		if (this.status === 'up' || this.options.fixed)
			top = position + this.options.windowTopOffset - this.references.containerTop;
		if (this.status === 'down' && !this.options.fixed)
			top = (position - ref.containerTop + ref.windowHeight) - this.options.windowBottomOffset - ref.elementHeight;

		if (top < this.options.topOffset)
			top = this.options.topOffset;
		if (top > maxTop) top = maxTop;

		this.wrapper.setStyles({
			position: 'absolute',
			top: top,
			left: this.references.elementLeft
		});

		this.positioning = 'absolute';
	}

});

})();
