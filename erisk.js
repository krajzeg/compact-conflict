var sin = Math.sin;
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

// ==========================================================
// This part of the code deals with procedural map generation
// prior to gameplay.
// ==========================================================

var blockSize = 25, 
		mapWidth = 30, 
		mapHeight = 20, 
		maxRegionSize = 8,
		neededRegions = 20;
function generateMap(container) {
	var perturbConst = rint(0,100000);
	var regionMap = range(0,mapWidth).map(function(){return []});
	var regions = [], count = 0;

	while(count < neededRegions) {
		var bounds = {
			l: rint(1, mapWidth-maxRegionSize-1),
			t: rint(1, mapHeight-maxRegionSize-1),
			w: rint(1, maxRegionSize), h: rint(1, maxRegionSize)
		}; 
		if (count && !overlaps(bounds)) continue;
		
		while(1) {
			if (shrink(bounds))
				break;
			if (!overlaps(bounds)) {
				regions.push(makeRegionAt(bounds));
				count++;
				break;
			}
		}
	}

	fillNeighbourLists();
	makeDOMElements();

	return regions;
	
	function shrink(bounds) {
		var r = rint(0,4);
		if (r % 2) bounds.w--; else bounds.h--;
		if (r == 2) bounds.l++;
		if (r == 3) bounds.t++;
		return (bounds.w * bounds.h < 5);
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
		x *= blockSize; y *= blockSize;
		var angle = (sin(x*y+perturbConst*357)) * 180.0;
		var dist = (sin(x*y+perturbConst*211)) * blockSize / 2;
		return [x+sin(angle)*dist,y+Math.cos(angle)*dist];
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

	function makeDOMElements() {
		container.innerHTML = "<svg width='1000' height='1000'>" + 
			map(regions, function(region) {
				return "<polygon points='" + 
					region.p.join(" ") + 
					"'style='fill:#777;stroke:#000;'></polygon>";
			}).join("") + 
			"</svg>";

		var svg = document.querySelector('svg');
		map(svg.childNodes, function(polygon, index) {
			var region = regions[index];
			region.i = index;
			region.e = polygon;
		});
	}
}

function makeInitialState(regions) {
	var players = [{c: '#ff0'}, {c: '#00f'}];
	return {
		r: regions,
		p: players,
		o: {0: players[0], 19: players[1]},
		t: {0: {}, 19: {}},
		s: []
	}
}

function updateRegionDisplay(gameState, region) {
	var owner = gameState.o[region.i];
	region.e.style.fill = owner ? owner.c : 'gray';
	var temple = gameState.t[region.i];
	if (temple)
		region.e.style.strokeWidth = 3;
}

function updateDisplay(gameState) {
	map(gameState.r, updateRegionDisplay.bind(gameState, gameState));
}

var regions = generateMap(document.body);
var state = makeInitialState(regions);
updateDisplay(state);
