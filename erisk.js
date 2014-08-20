var sin = Math.sin;
function random(low,high) { 
	return low + Math.random() * (high-low)
}
function map(seq,fn) {
	var transformed = [];
	for (var p in seq)
		transformed.push(fn(seq[p],p));
	return transformed;
}

/*function cls(proto) {
	map(proto, function(fn, p) {
		if (typeof fn == 'function')
			proto[p] = function() {
				return fn.apply(fn, [this].concat([].slice.call(arguments)));
			}
	});
	return function() {
		var object = {};
		proto.i.apply(object, arguments);
		object.__proto__ = proto;
		return object;
	}
}

var Region = cls({
	i: function(self, points) {
		self.p = points;
	}
});*/

var regionSize = 100, pointCount = 4;
function generateRegions() {
	var perturbConst = random(1.0,2.0);
	return [makeRegionAt(1,0), makeRegionAt(2,0), makeRegionAt(2,1)];
	
	function perturb(x,y) {
		var angle = (sin(x*y+perturbConst*357)) * 180.0;
		var dist = (sin(x*y+perturbConst*211)) * regionSize / pointCount / 2;
		return [x+sin(angle)*dist,y+Math.cos(angle)*dist];
	}
	function makeRegionAt(x,y) {
		var points = [], xl = x * regionSize, yt = y * regionSize + x * regionSize / 2, inc = regionSize / pointCount;
		for (var i = 0; i < pointCount; i++) {
			points[i] = perturb(xl + inc*i, yt);
			points[i+pointCount] = perturb(xl + inc*pointCount, yt+inc*i);
			points[i+pointCount*2] = perturb(xl + inc*(pointCount-i), yt+inc*pointCount);
			points[i+pointCount*3] = perturb(xl, yt+inc*(pointCount-i));
		}
		return {p: points};
	}
}

function makeRegionSVGs(regions, container) {
	container.innerHTML = "<svg width='1000' height='1000'>" + 
		map(regions, function(region) {
			return "<polygon points='" + 
				region.p.join(" ") + 
				"'style='fill:gray;stroke:#000'></polygon>";
		}).join("") + 
		"</svg>";
}

makeRegionSVGs(generateRegions(), document.body);

