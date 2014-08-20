var sin = Math.sin;
function random(low,high) { 
	return low + Math.random() * (high-low)
}
function rint(low,high) {
	return Math.floor(random(low,high));
}
function range(low,high) {
	var r = [];
	for (var i = low; i < high; i++)
		r.push(i);
	return r;
}
function map(seq,fn) {
	var transformed = [];
	for (var p in seq)
		transformed.push(fn(seq[p],p));
	return transformed;
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

function generateRegions() {
	var perturbConst = random(1.0, 2.0);
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

	return regions;

	function forEachBlockOfRegion(bounds,fn) {
		var returnValue = false;
		with(bounds) {
			map(range(l,l+w), function(x){
				map(range(t,t+h), function(y){
					returnValue = returnValue || fn(x,y);
				});
			});
		}
		return returnValue;
	}	
	
	function shrink(bounds) {
		var r = rint(0,4);
		if (r % 2) bounds.w--; else bounds.h--;
		if (r == 2) bounds.l++;
		if (r == 3) bounds.t++;
		if (bounds.w * bounds.h < 5)
			return true;
	}

	function overlaps(bounds) {
		return forEachBlockOfRegion(bounds,function(x,y){
			return regionMap[x][y];
		});
	}

	function makeRegionAt(bounds) {
		// make points for the region
		with(bounds) {
			var points = [];
			for (var i = 0; i < w; i++) {
				points[i] = perturbedPoint(l+i,t);
				points[w+h+i] = perturbedPoint(l+w-i,t+h);
			}
			for (i = 0; i < h; i++) {
				points[w+i] = perturbedPoint(l+w,t+i);
				points[w+h+w+i] = perturbedPoint(l,t+h-i);
			}
			var region = {p: points};
			
			// mark it in the map
			forEachBlockOfRegion(bounds,function(x,y){
				regionMap[x][y] = region;
			});

			// return
			return region;
		}
	}

	function perturbedPoint(x,y) {
		x *= blockSize; y *= blockSize;
		var angle = (sin(x*y+perturbConst*357)) * 180.0;
		var dist = (sin(x*y+perturbConst*211)) * blockSize / 2;
		return [x+sin(angle)*dist,y+Math.cos(angle)*dist];
	}

}

function makeRegionSVGs(regions, container) {
	container.innerHTML = "<svg width='1000' height='1000'>" + 
		map(regions, function(region) {
			return "<polygon points='" + 
				region.p.join(" ") + 
				"'style='fill:rgba(127,127,127,0.5);stroke:#000'></polygon>";
		}).join("") + 
		"</svg>";
}

makeRegionSVGs(generateRegions(), document.body);

