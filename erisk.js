var sin = Math.sin, cos = Math.cos;
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
		neededRegions = 18;
function generateMap(container) {
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
	makeDOMElements();

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

	function projectPoint(p) {
		var x = p[0] / mapWidth, y = p[1] / mapHeight;
		var alpha = x * .4 + .6;
		y = y * alpha + 0.5 * (1-alpha);
		return [x*200, y*200];
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

	function makePolygon(points, id, fill) {
		return "<polygon id='" + id + "'points='" + 
			points.map(projectPoint).join(" ") + 
			"'style='fill:" + fill + ";stroke:#000;'></polygon>";
	}

	function makeDOMElements() {
		var polys = makePolygon([[0,0],[mapWidth,0],[mapWidth,mapHeight],[0,mapHeight]], 'b', '#05f');
		polys += map(regions, function(region, index) {
			return makePolygon(region.p, "r" + index, "#777");
		});
		container.innerHTML = "<svg viewbox='0 0 200 200' preserveAspectRatio='none'>" + polys + "</svg>"

		map(regions, function(region, index) {
			region.i = index;
			region.e = document.querySelector('#r' + index);
		});
	}
}

function makeInitialState(regions) {
	var players = [{c: '#ff0'}, {c: '#f00'}];
	return {
		r: regions,
		p: players,
		o: {0: players[0], 17: players[1]},
		t: {0: {}, 17: {}},
		s: []
	}
}

function updateRegionDisplay(gameState, region) {
	var owner = gameState.o[region.i];
	region.e.style.fill = owner ? owner.c : 'gray';
}

function updateDisplay(gameState) {
	map(gameState.r, updateRegionDisplay.bind(gameState, gameState));
}

var regions = generateMap(document.querySelector('#m'));
var state = makeInitialState(regions);
updateDisplay(state);
