"use strict";

/**
 * Create dimensions from the given values and store them for later use.
 * All values should be positive and make sense.
 * @param {number} width The outer width of the area.
 * @param {number} height The outer height of the area.
 * @param {number} top Margin form the top edge.
 * @param {number} right Margin form the right edge.
 * @param {number} bottom Margin form the bottom edge.
 * @param {number} left Margin form the left edge.
 */
function makeDimension(width, height, top, right, bottom, left) {
	return {width: width,
		height: height,
		innerWidth: width - (left + right),
		innerHeight: height - (top + bottom),
		top: top,
		right: right,
		bottom: bottom,
		left: left,
		cx: (width - (left + right)) / 2 + left,
		cy: (height - (top + bottom)) / 2 + top};
}

function randomAB(a, b) {
	return a + Math.random() * (b - a);
}

function mouseMoved() {
	var m = d3.svg.mouse(this);
	fittsTest.mouseMoved(m[0], m[1])
}

function mouseClicked() {
	var m = d3.svg.mouse(this);
	fittsTest.mouseClicked(m[0], m[1]);
}

function distance(a, b) {
	var dx = a.x - b.x;
	var dy = a.y - b.y;
	return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function bgRect(d, dim) {
	return d.append('rect')
		.attr('cx', 0)
		.attr('cy', 0)
		.attr('width', dim.width)
		.attr('height', dim.height)
		.attr('class', 'back');
}

var fittsTest = {

	// experiment params set here
	isoLimits: {
		minD: 100, maxD: 500, // min and max distance, in pixels
		minW: 10, maxW: 100,  // min and max target width, in pixels
		num: 5, // number of targets in a trial
		nTrials: 3 // number of trials in an experiment
	},

	target: {x: 0, y: 0, r: 10},
	start: {x: 0, y: 0, t: 0},
	last: {},

	isoPositions: [],
	currentPosition: 0,
	currentCount: 0,
	totalCount: 0,
	miss: 0,
	
	isoParams: {num: 5, distance: 200, width: 50, randomize: true},
	
	currentPath: [],
	active: false,
	
	data: [],
	
	sumID: 0,
	sumTime: 0,
	
	updateTimeoutHandle: undefined,

	startTest: function () {		
		this.updateISOCircles();		
	},

	endTest: function () {
		this.saveData();		
		window.location.replace("thanks.html");
	},

	generateTarget: function() {
		this.target = this.isoPositions[this.currentPosition];
		this.target.distance = this.isoParams.distance;
		this.currentPosition = (this.currentPosition + Math.ceil(this.isoPositions.length/2)) % this.isoPositions.length;
		
		var target = testAreaSVG.selectAll('#target').data([this.target]);
		
		var insert = function(d) {
			d.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; })
			.attr('r', function(d) { return d.w / 2; });
		}

		target.enter()
			.append('circle')
				.attr('id', 'target')
				.style('fill', 'red')
				.call(insert);
									
		target.transition()
				.call(insert);

		
		this.active = true;
	},
	
	updateISOCircles: function() {
		this.currentCount = 0;
		
		this.generateISOPositions(this.isoParams.num,
			this.isoParams.distance,
			this.isoParams.width);

		var circles = testAreaSVG.selectAll('circle').data(this.isoPositions);
		
		var insert = function(d) {
			d.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; })
			.attr('r', function(d) { return d.w / 2; });
		}

		circles.enter()
			.append('circle')
				.attr('class', 'iso')
				.call(insert);
									
		circles.transition()
			.call(insert);
		
		circles.exit()
			.transition()
				.attr('r', 0)
				.remove();
				
		this.currentPosition = 0;
		this.generateTarget();
		this.active = false;
},
	
	generateISOPositions: function(num, d, w) {		
				
		this.isoPositions = [];
		
		for (var i = 0; i < num; i++) {
			this.isoPositions[i] = {x: testDimension.cx + ((d/2) * Math.cos((2 * Math.PI * i) / num)),
				y: testDimension.cy + ((d/2) * Math.sin((2 * Math.PI * i) / num)),
				w: w};
		}
	},
	
	removeTarget: function() {
		testAreaSVG.selectAll('#target').data([])
			.exit()
				.remove();
				
		this.active = false;
		this.currentPath = [];
	},
	
	mouseClicked: function(x, y) {
		
		if (distance({x: x, y: y}, this.target) < (this.target.w / 2)) {
			this.addDataPoint({start: this.start,
							   target: this.target,
							   path: this.currentPath,
							   hit: {x: x, y: y, t: (new Date).getTime()}});
			this.removeTarget();

			if (this.isoParams.randomize && this.currentCount >= this.isoPositions.length) {
				this.totalCount++;
				if (this.totalCount >= this.isoLimits.nTrials) {

					this.endTest();

				} else {
					this.randomizeParams();
					this.currentCount = 0;
					this.currentPosition = 0;
					this.miss = 0;
					this.updateISOCircles();
					this.generateTarget();
					this.active = false;
				}
			}
			else {
				this.currentCount++;
				this.generateTarget();			
			}
			
			this.last = {x: x, y: y, t: (new Date).getTime()};
			this.start = this.last;
			this.currentPath.push(this.last);
		}
		else {
			this.miss++;
		}
	},
	
	mouseMoved: function(x, y) {
		if (this.active) {
			// skip if the mouse did actually not move
			// that should practically never happen...
			if (x == this.last.x && y == this.last.y) {
				return;
			}
			
			// set timeout for updating plots
			if (this.updateTimeoutHandle) {
				window.clearTimeout(this.updateTimeoutHandle);
			}
			this.updateTimeoutHandle = window.setTimeout(this.updatePlots, UPDATE_DELAY, this);		
			
			var newPoint = {x: x, y: y, t: (new Date).getTime()}
			this.currentPath.push(newPoint)
				
			this.last = newPoint;
		}
	},
	
	addDataPoint: function(data) {
		// add point to data array
		if (this.active == false)
			return;

		var dt = data.hit.t - data.start.t;
	
		if (dt < MAX_TIME)  // skip if obvious outlier
		{
			this.data.push({
				time: dt,
				distance: data.target.distance,
				width: data.target.w,
				hit: data.hit,
				start: data.start,
				target: data.target,
				path: data.path
			});	
		}
	},
	
	randomizeParams: function () {
		this.isoParams.num = this.isoLimits.num;
		this.isoParams.distance = Math.floor(randomAB(this.isoLimits.minD, this.isoLimits.maxD));
		this.isoParams.width = Math.floor(randomAB(this.isoLimits.minW, this.isoLimits.maxW));

		this.updateISOCircles();
	},

	saveData: function() {
		// download currently available data		

		//TODO: make filename with date/time
		
		var fileName = (new Date()).toISOString().replace(/:/g, '.').replace(/-/g, '.').replace(/T/, ' ').slice(0, -5) + 'UTC fitts_data.json';
		
		var downloadAnchorNode = document.createElement('a');
		downloadAnchorNode.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.data)));
		downloadAnchorNode.setAttribute('download', fileName);
		document.body.appendChild(downloadAnchorNode); // required for firefox
		downloadAnchorNode.click();
		downloadAnchorNode.remove();		
	},
};

// init code

// set up dimensions for the plotting.
var testDimension = makeDimension(800, 600, 30, 30, 30, 30);

var LIVE_STAY = 1000;
var MAX_TIME = 2000;
var UPDATE_DELAY = MAX_TIME;
var MAX_SPEED = 6; // pixel/ms

// init test area
var testAreaSVG = d3.select('#test-area').append('svg')
	.attr('width', testDimension.width)
	.attr('height', testDimension.height)
	.style('pointer-events', 'all')
    .on('mousemove', mouseMoved)
	.on('mousedown', mouseClicked)
	.call(bgRect, testDimension);

//start test
fittsTest.startTest()
