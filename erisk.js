// ==========================================================
// Game-wide constants
// ==========================================================

var mapWidth = 30, 
	mapHeight = 20, 
	maxRegionSize = 8,
	neededRegions = 23,
	playerCount = 3,
	movesPerTurn = 2,
	turnCount = 20;

// ==========================================================
// Game-relevant constants
// ==========================================================

// === The four elements
var earth = {c: '#554', t:'&#22303;'};
var air   = {c: '#ccf', t:'&#39080;', s: earth};
var fire  = {c: '#f00', t:'&#28779;', s: air};
var water = {c: '#06c', t:'&#27700;', s: fire};
var none = {c: '#777', t:''};

earth.s = water;
var elements = [earth, air, fire, water];

// === The possible move types
var MOVE_ARMY = 1, END_TURN = 2;

// ==========================================================
// Helper functions used for brevity or convenience.
// ==========================================================

var sin = Math.sin, 
	cos = Math.cos, 
	
	wnd = window, 
	doc = document, 
	$ = doc.querySelector.bind(doc)

	div = elem.bind(0,'div');

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
function forEachProperty(obj,fn) {
	for (var property in obj)
		fn(obj[property], property);
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
function deepCopy(obj, depth) {
	if ((!depth) || (typeof obj != 'object')) return obj;

	var copy = (obj.length !== undefined) ? [] : {};
	forEachProperty(obj, function(value, key) {
		copy[key] = deepCopy(value, depth-1);
	});
	return copy;
}
function identity(x) { return x; }
function min(seq, key) {
	key = key || identity;
	var smallestValue = key(seq[0]), smallestElement;
	map(seq, function(e) {
		if (key(e) <= smallestValue) {
			smallestElement = e;
			smallestValue = key(e);
		}
	});
	return smallestElement;
}
function pairwise(array, fn) {
	var result = [];
	map(array, function(elem1, index) {
		map(array.slice(index+1), function(elem2) {
			result.push(fn(elem1, elem2));
		});
	});
	return result;
}

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
				regions.push(makeRegionAt(count++, bounds));
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

	function makeRegionAt(index, bounds) {
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
		var region = {i: index, p: points};
		
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
	return [x*100, y*100];
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
		cx: '-100%', cy: '50%',
		fx: '-100%', fy: '50%',
		r: '200%',
		gradientUnits: 'userSpaceOnUse'
	}, gradientStop(60, dark) + gradientStop(100, light));
}

function makePolygon(points, id, fill, noStroke) {
	return elem('polygon', {
		i: id,
		points: map(points, projectPoint).join(' '),
		s: 'fill:url(#' + fill + ');' + ((noStroke) ? '' : 'stroke:#000;stroke-width:0.25')
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
		viewbox: '0 0 100 100',
		preserveAspectRatio: 'none'
	}, defs + ocean + shadows + bottoms + tops);

	map(regions, function(region, index) {
		region.e = $('#r' + index);
		region.c = projectPoint(centerOfWeight(region.p));

		region.e.onclick = invokeUICallback.bind(0, region, 'c');
		region.e.ondblclick = invokeUICallback.bind(0, region, 'd');
		region.e.onmouseover = invokeUICallback.bind(0, region, 'i');
		region.e.onmouseout = invokeUICallback.bind(0, region, 'o');
	});

	makeTemples();
	makeInitialUI();

	function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, noStroke) {
		return elem('g', {}, map(regions, function(region, index) {
			return makePolygon(transformPoints(region.p, xm, ym, xd, yd), idPrefix + index, gradient, noStroke);
		}).join(""));
	}

	function makeTemples() {
		forEachProperty(gameState.t, function(temple, index) {

			var center = temple.r.c, 
				id = 'tp' + index, iid = 'ti' + index,
				style = 'left:' + (center[0]-1.5) + '%;top:' + (center[1]-4) + '%';
			
			var templeHTML = div({
				i: id,
				c: 'o',
				s: style
			}, div({i: iid, c: 'i'}));

			container.insertAdjacentHTML('beforeend', templeHTML);
			temple.e = $('#'+id);
			temple.i = $('#'+iid);			
		});
	}

	function makeInitialUI() { 
		var moveState = gameState.m;
		var activePlayer = gameState.p[moveState.p];
		var turnNumber = gameState.m.t;

		var html = div({i: 'tc', c: 'sc'});
		html += div({c: 'sc un'}, map(gameState.p, function(player) {
			return div({i: 'pl' + player.i, c: 'pli', style: 'background: ' + player.d}, player.n);
		}).join(''));

		$("#d").innerHTML = html;
	}
}

// ==========================================================
// This part of the code deals with responding to user actions
// ==========================================================

var uiCallbacks = {};

function invokeUICallback(object, type) {
	var cb = uiCallbacks[type];
	if (cb)
		cb(object);
	return false;
}

function uiPickMoveArmy(player, state, reportMoveCallback) {
	state.d = {
		b: [
			{i: 'end', t: 'End turn'}
		]};

	uiCallbacks.c = function(region) {
		if (!state.d.s) {
			// no move in progress - start a new move if this is legal
			if (state.o[region.i] != player) return;  // not our region, can't move
			if (!soldierCount(state, region)) return; // no soldiers, can't move
			state.d.t = MOVE_ARMY;
			state.d.s = region;
			state.d.c = 1;
		} else {
			// we already have a move in progress
			var decisionState = state.d;
			// what region did we click?
			if (region == decisionState.s) {
				// the one we're moving army from - take more soldiers with us
				if (decisionState.c < soldierCount(state, region))
					decisionState.c++;
			} else if (decisionState.s.n.indexOf(region) > -1) {
				// one of the neighbours - let's finalize the move
				uiCallbacks = {};
				decisionState.d = region;
				reportMoveCallback(decisionState);
			}
		}
	}
	uiCallbacks.b = function() {
		// end turn
		uiCallbacks = {};
		reportMoveCallback({t: END_TURN});
	}
}

// ==========================================================
// This part of the code deals with updating the display to
// match the current game state.
// ==========================================================

var soldierDivsById = {};
function updateDisplay(gameState) {
	map(gameState.r, updateRegionDisplay);
	forEachProperty(gameState.t, updateTempleDisplay);

	var soldiersStillAlive = [];
	forEachProperty(gameState.s, function(soldiers, regionIndex) {
		map(soldiers, updateSoldierDisplay.bind(0, gameState.r[regionIndex]));
	});
	forEachProperty(soldierDivsById, function(div, id) {
		if (soldiersStillAlive.indexOf(parseInt(id)) < 0) {
			// this is an ex-div - in other words, the soldier it represented is dead
			$('#m').removeChild(div);
			delete soldierDivsById[id]; // surprisingly, this should be safe to do during iteration - http://stackoverflow.com/a/19564686
		}
	});

	updateUI();

	function updateRegionDisplay(region) {
		var owner = gameState.o[region.i];
		region.e.style.fill = 'url(#' + (owner ? 'p' + owner.i : 'l') + ')';		
	}
	function updateTempleDisplay(temple) {
		temple.e.style.background = temple.t.c;
		temple.i.innerHTML = temple.t.t;
	}
	function updateSoldierDisplay(region, soldier, index) {
		// we're still alive, so no removing our <div>
		soldiersStillAlive.push(soldier.i);
		
		// find or create a <div> for showing the soldier
		var domElement = soldierDivsById[soldier.i];
		if (!domElement) {
			var html = div({
				c: 's',
				s: 'background:' + soldier.t.c
			});
			var container = $('#m');
			container.insertAdjacentHTML('beforeEnd', html);
			domElement = soldierDivsById[soldier.i] = container.lastChild;			
		}

		// (re)calculate where the <div> should be
		var center = region.c;
		var totalSoldiers = soldierCount(gameState, region);
		var offset = (-0.6 * totalSoldiers + index * 1.2);
		domElement.style.left = (center[0]+offset-0.3) + '%';
		domElement.style.top  = (center[1]+1.5+offset*0.2) + '%';
	}

	function updateUI() {
		// turn counter
		$('#tc').innerHTML = "Turn <b>" + gameState.m.t + "</b> / " + turnCount;

		// player activation
		map(gameState.p, function(player) {
			var active = player.i == gameState.m.p;
			$('#pl' + player.i).className = active ? 'pl' : 'pi';
		})

		// buttons
		$('#u').innerHTML = '';
		var decisionState = gameState.d;
		map((decisionState && decisionState.b) || [], function(button) {
			var buttonHTML = elem('a', {href: "#", i: button.i}, button.t);
			$('#u').insertAdjacentHTML('beforeend', buttonHTML);
			$("#" + button.i).onclick = invokeUICallback.bind(0, button.i, 'b');	
		});
	}
}

function preserveAspect() {
	var w = wnd.innerWidth, h = wnd.innerHeight, aspect = 1.65, px = 'px';
	if (w / h > aspect) {
		w = h * aspect;
	} else {
		h = w / aspect;
	}

	var styles = $('#c').style;
	styles.width = w + px;
	styles.height = h + px;
	styles.fontSize = 0.025 * h + px;
}

// ==========================================================
// Preparing the initial game state happens here
// ==========================================================

function makeInitialState(regions) {
	var players = [
		{i:0, n: 'Yellow', l: '#ffa', d:'#960'}, 
		{i:1, n: 'Red', l: '#f88', d:'#722'},
		{i:2, n: 'Violet', l: '#d9d', d:'#537'}
	];
	var regions = generateMap();
	var gameState = {
		p: players,
		r: regions,
		o: {}, t: {}, s: {},
		m: {t: 1, p: 0, m: MOVE_ARMY, l: movesPerTurn}
	}
	
	setupTemples();

	return gameState;

	function distance(region1, region2) {
		var c1 = centerOfWeight(region1.p), c2 = centerOfWeight(region2.p),
			dx = c1[0]-c2[0];
			dy = c1[1]-c2[1];
		return Math.sqrt(dx*dx+dy*dy);
	}

	function distanceScore(regions) {
		return -min(pairwise(regions, distance));
	}

	function randomRegion() {
		return regions[rint(0, regions.length)];
	}

	function setupTemples() {
		// pick three regions that are as far away as possible from each other
		// for the players' initial temples
		var possibleSetups = map(range(0,1000), function() {
			return map(range(0,3), randomRegion);
		});
		var templeRegions = min(possibleSetups, distanceScore);

		// we have the regions, set up each player
		map(players, function(player, index) {
			var region = templeRegions[index];
			// make one of the regions your own
			gameState.o[region.i] = player;
			// put a temple and 3 soldiers in it
			putTemple(region, 3);
		});

		// setup neutral temples
		map(range(0,3), function() {
			var bestRegion = min(gameState.r, function(region) {
				return distanceScore(templeRegions.concat(region));
			});
			putTemple(bestRegion, 2);
			templeRegions.push(bestRegion);
		});
	}

	function putTemple(region, soldierCount) {
		var index = region.i;
		gameState.t[index] = {r: region, i: index, t: none};
		addSoldiers(gameState, region, none, soldierCount);
	}
}

// ==========================================================
// All the game logic and the machinery that runs its main
// loop reside below.
// ==========================================================

var soldierCounter;

function pickMove(player, state, typeOfMove, reportMoveCallback) {
	// for testing
	uiPickMoveArmy(player, state, reportMoveCallback);
}

function makeMove(state, move) {
	var state = copyState(state);
	
	var moveType = move.t;
	if (moveType == MOVE_ARMY) {
		moveSoldiers(state, move.s, move.d, move.c);
	} else if (moveType == END_TURN) {
		nextTurn(state);
	}

	return state;
}

/**
 * Creates an independent copy of the game state, prior to modifying it.
 **/
function copyState(state) {	
	return {
		// some things are constant and can be shallowly copied
		r: state.r, 
		p: state.p,
		// some others... less so
		m: deepCopy(state.m, 1), // this will be 1, once the "move state" gets more complex
		o: deepCopy(state.o, 1),
		t: deepCopy(state.t, 2),
		s: deepCopy(state.s, 3)
		// and some others are completely omitted - namely 'd', the current "move decision" partial state
	};
}

function playOneMove(state) {
	var controllingPlayer = state.p[state.m.p]; // whose the active player to make some kind of move?
	var typeOfMove = state.m.t; // what type of move is needed?

	// let the player pick their move using UI or AI
	pickMove(controllingPlayer, state, typeOfMove, function(move) {
		// the move is chosen - update state to a new immutable copy
		var newState = makeMove(state, move);
		// update display according to that new state
		updateDisplay(newState);
		// schedule next move
		setTimeout(playOneMove.bind(0, newState), 1);
	});

	// update display with the move in progress
	updateDisplay(state);
}

function moveSoldiers(state, fromRegion, toRegion, howMany) {
	var fromList = state.s[fromRegion.i];
	var toList = state.s[toRegion.i] || (state.s[toRegion.i] = []);
	var fromOwner = state.o[fromRegion.i];
	var toOwner = state.o[toRegion.i];

	// do we have a fight?
	if (fromOwner != toOwner) {
		// first, the attackers kill some defenders
		var incomingStrength = howMany;
		var defendingStrength = toList.length;
		var defenderCasualties = incomingStrength - defendingStrength;
		map(range(0,defenderCasualties), function() { toList.shift() });
		// now, defenders fight back
		defendingStrength = toList.length;
		map(range(0,defendingStrength), function() { fromList.shift() });
		// no conquest if there are defenders left
		if (defendingStrength)
			howMany = 0;
	}

	if (howMany > 0) {
		// move the (remaining) soldiers
		map(range(0, howMany), function() {
			toList.push(fromList.shift());
		});

		// if we got here, the fight is over - take ownership of the destination region
		state.o[toRegion.i] = state.o[fromRegion.i];
	}

	// next move
	var moveState = state.m;
	if (!--moveState.l)
		nextTurn(state);
}

function nextTurn(state) {
	var player = state.p[state.m.p];
	
	// temples produce one soldier per turn automatically
	forEachProperty(state.t, function(temple, regionIndex) {
		if (state.o[regionIndex] == player) {
			// this is our temple, add a soldier of the temple's element
			addSoldiers(state, temple.r, temple.t, 1);
		}
	});

	// next turn, next player!
	var nextPlayer = (player.i + 1) % playerCount;
	var turnNumber = state.m.t + (nextPlayer ? 0 : 1); 
	state.m = {t: turnNumber, p: nextPlayer, m: MOVE_ARMY, l: movesPerTurn};	
}

function soldierCount(state, region) {
	var list = state.s[region.i];
	return list ? list.length : 0;
}

function addSoldiers(state, region, element, count) {
	map(range(0,count), function() {
		soldierCounter = (soldierCounter + 1) || 0;

		var soldierList = state.s[region.i];
		if (!soldierList)
			soldierList = state.s[region.i] = [];

		soldierList.push({
			i: soldierCounter++,
			t: element
		});
	});
}

// ==========================================================
// This part of the code initalizes a new game.
// ==========================================================

// keep the aspect of the gameplay area correct
(wnd.onresize = preserveAspect)();

// start the game
var state = makeInitialState();
prepareDisplay($('#m'), state);
updateDisplay(state);
playOneMove(state);
