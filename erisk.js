// ==========================================================
// Game-wide constants
// ==========================================================

var mapWidth = 30, 
	mapHeight = 20, 
	maxRegionSize = 8,
	neededRegions = 18;


// ==========================================================
// Helper functions used for brevity or convenience.
// ==========================================================

var sin = Math.sin, cos = Math.cos, doc = document, $ = doc.querySelector.bind(doc);
function rint(low,high) {
	return Math.floor(low+Math.random()*(high-low));
}
function range(low,high) {
	var r = [];
	for (var i = low; i < high; i++)
		r.push(i);
	return r;
}
function map(seq,fn) {
	return [].slice.call(seq).map(fn);
}
function for2d(x1,y1,x2,y2,fn) {
	map(range(x1,x2), function(x) {
		map(range(y1,y2), fn.bind(0,x));
	});
}
function elem(tag,attrs,contents) {
	var expanded = {
		c: 'class',
		s: 'style',
		i: 'id'
	}
	var html = "<" + tag + " ";
	for (var attributeName in attrs) {
		html += (expanded[attributeName] || attributeName) + "='" + attrs[attributeName] + "'";
	}
	html += ">" + (contents || '') + "</" + tag + ">";

	return html;
}

// ==========================================================
// This part of the code initalizes a new game.
// ==========================================================

var state = makeInitialState();
prepareDisplay($('#m'), state);
updateDisplay(state);

// ==========================================================
// This part of the code deals with procedural map generation
// prior to gameplay.
// ==========================================================

function generateMap() {
	var perturbConst = rint(0,100000);
	var regionMap = range(0,mapWidth).map(function(){return []});
	var regions = [], count = 0;

	while(count < neededRegions) {
		var bounds = {
			l: rint(1, mapWidth-maxRegionSize+1),
			t: rint(1, mapHeight-maxRegionSize+1),
			w: rint(3, maxRegionSize), h: rint(3, maxRegionSize)
		}; 
		if (count && !overlaps(bounds)) continue;
		
		while(!shrink(bounds)) {
			if (!overlaps(bounds)) {
				regions.push(makeRegionAt(bounds));
				count++;
				break;
			}
		}
	}

	fillNeighbourLists();	
	return regions;
	
	function shrink(bounds) {
		var r = rint(0,4);
		if (r % 2) bounds.w--; else bounds.h--;
		if (r == 2) bounds.t++;
		if (r == 3) bounds.l++;
		return (bounds.w * bounds.h < 9);
	}

	function overlaps(bounds) {
		var rv = false;
		for2d(bounds.l, bounds.t, bounds.l+bounds.w, bounds.t+bounds.h, function(x,y) {
			rv = rv || regionMap[x][y];
		});
		return rv;
	}

	function makeRegionAt(bounds) {
		// make points for the region
		var l=bounds.l,t=bounds.t,w=bounds.w,h=bounds.h;
		var points = [];
		map(range(0,w), function(i) {
			points[i] = perturbedPoint(l+i,t);
			points[w+h+i] = perturbedPoint(l+w-i,t+h);
		});
		map(range(0,h), function(i) {
			points[w+i] = perturbedPoint(l+w,t+i);
			points[w+h+w+i] = perturbedPoint(l,t+h-i);
		});
		var region = {p: points};
		
		// mark it in the map
		for2d(bounds.l, bounds.t, bounds.l + bounds.w, bounds.t + bounds.h, function(x,y){
			regionMap[x][y] = region;
		});

		// return
		return region;
	}

	function perturbedPoint(x,y) {
		var angle = (sin(x*y*600+perturbConst*357)) * 6.28;
		var dist = (sin(x*y*600+perturbConst*211)) / 2;
		return [x+sin(angle)*dist, y+cos(angle)*dist];
	}

	function fillNeighbourLists() {
		for2d(1, 1, mapWidth-1, mapHeight-1, function(x,y) {
			var region = regionMap[x][y];
			if (region) {
				if (!region.n) region.n = [];
				for2d(-1,-1,2,2,function(dx,dy) {
					var potentialNeighbour = regionMap[x+dx][y+dy];
					if (potentialNeighbour && (potentialNeighbour != region) && (region.n.indexOf(potentialNeighbour) == -1))
						region.n.push(potentialNeighbour);
				});
			}
		});
	}
}

// ==========================================================
// This part of the code creates the initial rendering of the
// game map as an SVG object.
// ==========================================================

function centerOfWeight(points) {
	var xc = 0.0, yc = 0.0, l = points.length;
	map(points, function(p) {
		xc += p[0]; yc += p[1];
	});
	return [xc/l, yc/l];
}

function transformPoints(points, xm, ym, xd, yd) {
	var c = centerOfWeight(points);
	return map(points, function(p) {
		return [c[0] + (p[0]-c[0]) * xm + xd, c[1] + (p[1]-c[1]) * ym + yd];
	});
}

function projectPoint(p) {
	var x = p[0] / mapWidth, y = p[1] / mapHeight;
	var alpha = x * .4 + .6;
	y = y * alpha + 0.5 * (1-alpha);
	return [x*200, y*200];
}

function gradientStop(percent, color) {
	return elem('stop', {
		offset: percent + '%',
		s: 'stop-color:' + color
	});
}

function makeGradient(id, light, dark) {
	return elem('radialGradient', {
		i: id,
		cx: '-100%',
		cy: '50%',
		r: '200%',
		fx: '-100%',
		fy: '50%',
		gradientUnits: 'userSpaceOnUse'
	}, gradientStop(60, dark) + gradientStop(100, light));
}

function makePolygon(points, id, fill, noStroke) {
	return elem('polygon', {
		i: id,
		points: map(points, projectPoint).join(' '),
		s: 'fill:url(#' + fill + ');' + ((noStroke) ? '' : 'stroke:#000;stroke-width:0.5')
	})
}


function prepareDisplay(container, gameState) {
	var regions = gameState.r;

	var defs = elem('defs', {}, 		
		makeGradient('b', '#88f', "#113") + 
		makeGradient('l', '#fc9', '#530') + 	
		makeGradient('d', '#210', '#000') +
		makeGradient('w', '#55f', '#003') +
		map(gameState.p, function(player, index) {
			return makeGradient('p' + index, player.l, player.d);
		}).join(""));

	var ocean = makePolygon([[0,0],[mapWidth,0],[mapWidth,mapHeight],[0,mapHeight]], 'b', 'b');
	var tops = makeRegionPolys('r', 'l', 1, 1, 0, 0);
	var bottoms = makeRegionPolys('d', 'd', 1, 1, .05, .05);
	var shadows = makeRegionPolys('w', 'w', 1.05, 1.05, .2, .2, true);

	container.innerHTML = elem('svg', {
		viewbox: '0 0 200 200',
		preserveAspectRatio: 'none'
	}, defs + ocean + shadows + bottoms + tops);

	map(regions, function(region, index) {
		region.i = index;
		region.e = $('#r' + index);
		region.c = projectPoint(centerOfWeight(region.p));
	});

	makeTemples();

	function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, noStroke) {
		return elem('g', {}, map(regions, function(region, index) {
			return makePolygon(transformPoints(region.p, xm, ym, xd, yd), idPrefix + index, gradient, noStroke);
		}).join(""));
	}

	function makeTemples() {
		/*map(gameState.t, function(temple) {
			var templeHTML = div('o', div('i','',''));
			container.insertAdjacentHTML('beforeend', templeHTML);
		});*/
	}
}

// ==========================================================
// This part of the code deals with updating the display to
// match the current game state.
// ==========================================================

function updateDisplay(gameState) {
	map(gameState.r, updateRegionDisplay);
	function updateRegionDisplay(region) {
		var owner = gameState.o[region.i];
		region.e.style.fill = 'url(#' + (owner ? 'p' + owner.i : 'l') + ')';
	}
}

// ==========================================================
// Game logic
// ==========================================================

function makeInitialState(regions) {
	var regions = generateMap();
	var players = [{i:0, l: '#ff0', d:'#a70'}, {i:1, l: '#f60', d:'#700'}];
	return {
		r: regions,
		p: players,
		o: {0: players[0], 4: players[1]},
		t: {0: {}, 4: {}},
		s: []
	}
}
