// ==========================================================
// Game-controlling constants
// ==========================================================

var mapWidth = 30, 
	mapHeight = 20, 
	movesPerTurn = 3,
    minimumAIThinkingTime = 1000,
    maximumAIThinkingTime = 5000;

// ==========================================================
// Game data
// ==========================================================

// === The possible move types
var MOVE_ARMY = 1, BUILD_ACTION = 2, END_TURN = 3;

// === Player properties
var PLAYER_TEMPLATES = [
    {i:0, n: 'Amber', l: '#fd8', d:'#960', h: '#fd8', hd:'#a80'},
    {i:1, n: 'Crimson', l: '#f88', d:'#722', h: '#faa', hd:'#944'},
    {i:2, n: 'Lavender', l: '#d9d', d:'#537', h: '#faf', hd:'#759'},
    {i:3, n: 'Emerald', l: '#9d9', d:'#262', h: '#bfb', hd:'#484'}
];

// === Possible temple upgrades
var UPGRADES = [
    {n: "Extra soldier", d: "", c: map(range(0,100), function(n) { return 8 + n * 4; }), x: []},
    {n: "X of Water", d: "Income: X% more each turn.",
        c: [15, 25], x: [20, 40],
        b: '#66f'},
    {n: "X of Fire",  d: "Attack: X invincible soldier(s).",
        c: [20, 30], x: [1, 2],
        b: '#f88'},
    {n: "X of Air",   d: "Move: X extra move(s) per turn.",
        c: [25, 35], x: [1, 2],
        b: '#ffa'},
    {n: "X of Earth", d: "Defense: Always kill X invader(s).",
        c: [30, 45], x: [1, 2],
        b: '#696'},
    {n: "Rebuild temple", d: "Switch to a different upgrade.",
        c: [0], x: []}
    ],
    LEVELS = ["Temple", "Cathedral"],
    SOLDIER = UPGRADES[0], WATER = UPGRADES[1], FIRE = UPGRADES[2], AIR = UPGRADES[3], EARTH = UPGRADES[4], RESPEC = UPGRADES[5];

// === Constants for setup screen
var PLAYER_OFF = 0, PLAYER_HUMAN = 1, PLAYER_AI = 2;
var AI_NICE = 0, AI_RUDE = 1, AI_MEAN = 2, AI_EVIL = 3;
var UNLIMITED_TURNS = 1000000, TURN_COUNTS = [9, 12, 15, UNLIMITED_TURNS];

// == Application "states"
var APP_SETUP_SCREEN = 0, APP_INGAME = 1;

// == Special "player" for signifying a draw game
var DRAW_GAME = {};

// == AI personalities - how eagerly it builds soldiers, and what upgrades it prefers
var AI_PERSONALITIES = [
    {s: 1, u:[]},
    {s: 0.2, u: [WATER, EARTH]},
    {s: 0.25, u: [WATER, FIRE, FIRE]},
    {s: 0.15, u: [WATER, WATER, EARTH, EARTH]},
    {s: 0.4, u: [WATER]},
    {s: 0.3, u: [WATER, WATER]},
    {s: 0.25, u: [FIRE, FIRE]},
    {s: 0.2, u: [EARTH, EARTH]}
];

// ==========================================================
// Helper functions used for brevity or convenience.
// ==========================================================

var sin = Math.sin, 
	cos = Math.cos,
    floor = Math.floor,
    ceil = Math.ceil,
	
	wnd = window, 
	doc = document, 

	div = elem.bind(0,'div');

// Returns a random number between low (inclusive) and high (exclusive).
function rint(low,high) {
	return floor(low+Math.random()*(high-low));
}

// Returns an array of integers from low (inclusive) to high (exclusive).
function range(low,high) {
	var r = [];
	for (var i = low; i < high; i++)
		r.push(i);
	return r;
}

// Identity function (useful as a default for callback accepting functions like min).
function identity(x) { return x; }

// Creates a deep copy of an object, handling nested objects and arrays. Depth controls how deep
// the copy goes - the number of nesting levels that should be replicated.
function deepCopy(obj, depth) {
    if ((!depth) || (typeof obj != 'object')) return obj;

    var copy = (obj.length !== undefined) ? [] : {};
    forEachProperty(obj, function(value, key) {
        copy[key] = deepCopy(value, depth-1);
    });
    return copy;
}

// Clamps a number - if it's lower than low or higher than high, it's brought into range.
function clamp(number, low, high) {
    return (number < low) ? low : ((number > high) ? high : number);
}

// Returns the current timestamp.
function now() {
    return Date.now();
}

// Treats a given text as a template, replacing 'X' with the second parameter.
function template(text, replacement) {
    return text.replace(/X/g, replacement);
}

// ==========================================================
// Loop constructs
// ==========================================================

// Same as array.map, but can be called on non-arrays (and minifies better).
function map(seq,fn) {
	return [].slice.call(seq).map(fn);
}

// Iterates over all properties of an object, and calls the callback with (value, propertyName).
function forEachProperty(obj,fn) {
	for (var property in obj)
		fn(obj[property], property);
}

// Iterates over a rectangle (x1,y1)-(x2,y2), and calls fn with (x,y) of each integer point.
function for2d(x1,y1,x2,y2,fn) {
	map(range(x1,x2), function(x) {
		map(range(y1,y2), fn.bind(0,x));
	});
}

// ==========================================================
// Working with the DOM
// ==========================================================

// Returns the element bearing the given ID.
function $(id) {
    return doc.querySelector('#' + id);
}

// Return HTML (string) for a new element with the given tag name, attributes, and inner HTML.
// Some attributes can be shorthanded (see map).
function elem(tag,attrs,contents) {
	var shorthanded = {
		c: 'class',
		s: 'style',
		i: 'id'
	};
	var html = '<' + tag + ' ';
	for (var attributeName in attrs) {
		html += (shorthanded[attributeName] || attributeName) + "='" + attrs[attributeName] + "'";
	}
	html += '>' + (contents || '') + '</' + tag + '>';

	return html;
}

// Appends new HTML to a container with the designated ID, and returns the resulting DOM node.
function append(containerId, newHTML) {
    var container = $(containerId);
    container.insertAdjacentHTML('beforeend', newHTML);
    return container.lastChild;
}

// Sets the 'transform' CSS property to a given value (also setting prefixed versions).
function setTransform(elem, value) {
    elem.style.transform = value;
    elem.style['-webkit-transform'] = value;
}

// Adds a handler that will be called when a DOM element is clicked or tapped (touch events).
function onClickOrTap(elem, fn) {
    elem.onclick = fn;
    elem.addEventListener('touchstart', function(event) {
        event.preventDefault();
        return fn(event);
    });
}

// Shows or hides an element with the given ID, depending on the second parameter.
function showOrHide(elementId, visible) {
    $(elementId).style.display = visible ? 'block' : 'none';
}

function hide(elementId) { showOrHide(elementId, 0); }
function show(elementId) { showOrHide(elementId, 1); }

function toggleClass(element, className, on) {
    if (typeof element == 'string')
        element = $(element);
    element.classList[on ? 'add' : 'remove'](className);
}

// ==========================================================
// Working on sequences
// ==========================================================

// Takes a sequence, and returns the smallest element according to a given key function.
// If no key is given, the elements themselves are compared.
function min(seq, keyFn) {
	keyFn = keyFn || identity;
	var smallestValue = keyFn(seq[0]), smallestElement;
	map(seq, function(e) {
		if (keyFn(e) <= smallestValue) {
			smallestElement = e;
			smallestValue = keyFn(e);
		}
	});
	return smallestElement;
}

// Returns the biggest element of a sequence, see 'min'.
function max(seq, keyFn) {
    keyFn = keyFn || identity;
    return min(seq, function(elem) { return -keyFn(elem); })
}

// Returns the sum of a sequences, optionally taking a function that maps elements to numbers.
function sum(seq, keyFn) {
    var total = 0;
    map(seq, function(elem){
        total += keyFn(elem);
    });
    return total;
}

// Checks whether a sequence contains a given element.
function contains(seq, elem) {
    return seq && (seq.indexOf(elem) >= 0);
}

// Takes an array, and returns another array containing the result of applying a function
// on all possible pairs of elements.
function pairwise(array, fn) {
	var result = [];
	map(array, function(elem1, index) {
		map(array.slice(index+1), function(elem2) {
			result.push(fn(elem1, elem2));
		});
	});
	return result;
}

// Shuffles a sequence (in place) and returns it.
function shuffle(seq) {
    map(seq, function(_, index) {
        var otherIndex = rint(index, seq.length);
        var t = seq[otherIndex];
        seq[otherIndex] = seq[index];
        seq[index] = t;
    });
    return seq;
}

// ==========================================================
// This part of the code deals with procedural map generation
// prior to gameplay.
// ==========================================================

// Generates a new map for a given number of players.
function generateMap(playerCount) {
    var maxRegionSize = 11 - playerCount;
    var neededRegions = 13 + playerCount * 3;
    var perturbConst = rint(10000,100000);

    var regionMap, regions, count, retries;

    // Repeat until we get a workable map
    do {
        regionMap = range(0,mapWidth).map(function(){return []});
        regions = []; count = 0; retries = 2500;

        // The main loop is repeated only a limited number of times to
        // handle cases where the map generator runs into a dead end.
        while ((count < neededRegions) && (--retries > 0)) {
            // create a random region
            var bounds = {
                l: rint(1, mapWidth - maxRegionSize + 1),
                t: rint(1, mapHeight - maxRegionSize + 1),
                w: rint(3, maxRegionSize), h: rint(3, maxRegionSize)
            };
            // it has to overlap one of the existing ones
            if (count && !overlaps(bounds)) continue;

            // we shrink it until it no longer overlaps - this guarantees
            // that it will border at least one other region, making the map
            // contiguous
            while (!shrink(bounds)) {
                if (!overlaps(bounds)) {
                    regions.push(makeRegionAt(count++, bounds));
                    break;
                }
            }
        }
    } while (!retries);

	fillNeighbourLists();	
	return regions;

    // Shrink the region given by 'bounds' in a random direction
	function shrink(bounds) {
		var r = rint(0,4);
		if (r % 2) bounds.w--; else bounds.h--;
		if (r == 2) bounds.t++;
		if (r == 3) bounds.l++;
		return (bounds.w * bounds.h < 9);
	}

    // Checks if the region given by 'bounds' overlaps any existing region.
	function overlaps(bounds) {
		var rv = false;
		for2d(bounds.l, bounds.t, bounds.l+bounds.w, bounds.t+bounds.h, function(x,y) {
			rv = rv || regionMap[x][y];
		});
		return rv;
	}

    // Puts a new rectangular region at the position given in bounds {Left, Top, Width, Height}.
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
		var region = {i: index, p: points, d:[]};
		
		// mark it in the map
		for2d(bounds.l, bounds.t, bounds.l + bounds.w, bounds.t + bounds.h, function(x,y){
			regionMap[x][y] = region;
		});

		// return
		return region;
	}

    // Perturbs a point to give the region borders a natural feel.
	function perturbedPoint(x,y) {
		var angle = (sin(x*x*y*y*600+perturbConst*357)) * 6.28;
		var dist = (sin(x*y*600+perturbConst*211)) / 2;
		return [x+sin(angle)*dist, y+cos(angle)*dist];
	}

    // Figures out who borders with who, using the 2d grid in 'regionMap'.
	function fillNeighbourLists() {
		for2d(1, 1, mapWidth-1, mapHeight-1, function(x,y) {
			var region = regionMap[x][y];
			if (region) {
				if (!region.n) region.n = [];
				map([[-1,0],[1,0],[0,-1],[0,1]],function(d) {
					var potentialNeighbour = regionMap[x+d[0]][y+d[1]];
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

// Returns the center of weight of a given set of [x,y] points.
function centerOfWeight(points) {
	var xc = 0.0, yc = 0.0, l = points.length;
	map(points, function(p) {
		xc += p[0]; yc += p[1];
	});
	return [xc/l, yc/l];
}

// Affine transform of a sequence of points: [x*xm+xd,y*ym+yd]
function transformPoints(points, xm, ym, xd, yd) {
	var c = centerOfWeight(points);
	return map(points, function(p) {
		return [c[0] + (p[0]-c[0]) * xm + xd, c[1] + (p[1]-c[1]) * ym + yd];
	});
}

// 3d projection for the map
function projectPoint(p) {
	var x = p[0] / mapWidth, y = p[1] / mapHeight;
	var alpha = x * .4 + .6;
	y = y * alpha + 0.5 * (1-alpha);
	return [x*100, y*100];
}

// Generate a SVG gradient stop tag.
function gradientStop(percent, color) {
	return elem('stop', {
		offset: percent + '%',
		s: 'stop-color:' + color
	});
}

// Generate a SVG gradient tag for the map.
function makeGradient(id, light, dark) {
	return elem('radialGradient', {
		i: id,
		cx: '-100%', cy: '50%',
		fx: '-100%', fy: '50%',
		r: '200%',
		gradientUnits: 'userSpaceOnUse' // we want it to scale with the map, not the region it's applied to
	}, gradientStop(60, dark) + gradientStop(100, light));
}

// Creates a new polygon with the given fill, stroke and clipping path.
function makePolygon(points, id, fill, stroke, clip) {
    stroke = stroke || "stroke:#000;stroke-width:0.25;";
    fill = fill ? "url(#" + fill + ")" : 'transparent';

    var properties = {
        i: id,
        points: map(points, projectPoint).join(' '),
        s: 'fill:' + fill + ";" + stroke + ';'
    };

    if (clip)
        properties['clip-path'] = clip

	return elem('polygon', properties);
}

// Takes the map (regions) stored in gameState.r, and creates an SVG map out of it.
function showMap(container, gameState) {
    var regions = gameState.r;

    // define gradients and clipping paths for rendering
    var defs = elem('defs', {},
            makeClipPaths() +
            makeGradient('b', '#88f', '#113') +
            makeGradient('l', '#fa6', '#530') +
            makeGradient('lh', '#fb7', '#741') +
            makeGradient('d', '#210', '#000') +
            makeGradient('w', '#55f', '#003') +
            map(gameState.p, function(player, index) {
                return makeGradient('p' + index, player.l, player.d) +
                    makeGradient('p' + index + 'h', player.h, player.hd);
            }).join(''));

    // create all the layers (5 per region)
    var ocean = makePolygon([[0,0],[mapWidth,0],[mapWidth,mapHeight],[0,mapHeight]], 'b', 'b');
    var tops = makeRegionPolys('r', 'l', 1, 1, 0, 0);
    var bottoms = makeRegionPolys('d', 'd', 1, 1, .05, .05);
    var shadows = makeRegionPolys('w', 'w', 1.05, 1.05, .2, .2, ' ');
    var highlighters = makeRegionPolys('hl', '', 1, 1, 0, 0, 'stroke:#fff;stroke-width:1.5;opacity:0.0;', 'clip');

    // replace the map container contents with the new map
    container.innerHTML = elem('svg', {
        viewbox: '0 0 100 100',
        preserveAspectRatio: 'none'
    }, defs + ocean + shadows + bottoms + tops + highlighters);

    // clean some internal structures used to track HTML nodes
    soldierDivsById = {};

    // hook up region objects to their HTML elements
    map(regions, function(region, index) {
        region.e = $('r' + index);
        region.c = projectPoint(centerOfWeight(region.p));

        region.hl = $('hl' + index);
        onClickOrTap(region.hl, invokeUICallback.bind(0, region, 'c'));
    });

    // additional callbacks for better UI
    onClickOrTap(doc.body, invokeUICallback.bind(0, null, 'c'));

    // make the temple <div>s
    makeTemples();


    // makes clipping paths for the "highlight" polygons
    function makeClipPaths() {
        return map(regions, function(region, index) {
            return elem('clipPath', {i: 'clip' + index}, makePolygon(region.p, 'cp' + index, 'l', ''));
        }).join('');
    }

    // a helper for creating a polygon with a given setup for all regions
    function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, stroke, clip) {
        return elem('g', {}, map(regions, function(region, index) {
            return makePolygon(transformPoints(region.p, xm, ym, xd, yd), idPrefix + index, gradient, stroke, clip ? 'url(#' + clip + index + ')' : '');
        }).join(''));
    }

    // makes temple, which are just <div>s with nested <div>s (the towers)
    function makeTemples() {
        forEachProperty(gameState.t, function(temple) {

            var center = temple.r.c,
                style = 'left:' + (center[0]-1.5) + '%;top:' + (center[1]-4) + '%';

            // create the temple <div>s
            var templeHTML = div({
                c: 'o',
                s: style
            }, div({c: 'i'}, div({c: 'i'}, div({c: 'i'}, div({c: 'i'})))));
            temple.e = append('m', templeHTML);

            // retrieve elements and bind callbacks
            onClickOrTap(temple.e, invokeUICallback.bind(0, temple.r, 't'));
        });
    }
}

// Prepares the whole sidebar on the left for gameplay use.
function prepareIngameUI(gameState) {
    // turn counter
    var html = div({i: 'tc', c: 'sc'});

    // player box area
    html += div({i: 'pd', c: 'sc un'}, map(gameState.p, function(player) {
        var pid = player.i;
        return div({
            i: 'pl' + pid,
            c: 'pl',
            style: 'background: ' + player.d
        }, player.n +
            div({c: 'ad', i: 'pr' + pid}) +
            div({c: 'ad', i: 'pc' + pid})
        );
    }).join(''));

    // info box
    html += div({c: 'sc un ds', i: 'in'});

    // set it all
    $('d').innerHTML = html;

    // show stat box and undo button
    map(['mv', 'und', 'end'], show);
}

// ==========================================================
// This part of the code deals with responding to user actions.
// ==========================================================

var uiCallbacks = {};

// This is the handler that gets attached to most DOM elements.
// Delegation through UI callbacks allows us to react differently
// depending on game-state.
function invokeUICallback(object, type, event) {
	var cb = uiCallbacks[type];
	if (cb) {
        playSound(audioClick);
		cb(object);
	}
    if (event.target.href && event.target.href != "#")
        return 1;

    event.stopPropagation();
	return 0;
}

// This is one of the "player controller" methods - the one that
// is responsible for picking a move for a player. This one does
// that using a human and some UI, and calls reportMoveCallback
// with an object describing the move once its decided.
var uiState = {};
function uiPickMove(player, state, reportMoveCallback) {
	var cleanState = {
		b: [
			{t: 'Cancel move', h:1},
			{t: 'End turn'}
		]
	};

	uiCallbacks.c = function(region) {
        if ((!region) || (state.d.t == BUILD_ACTION))
            setCleanState();

        if (!state.d.s && region) {
            // no move in progress - start a new move if this is legal
            if (regionHasActiveArmy(state, player, region)) {
                setCleanState();
                state.d.t = MOVE_ARMY;
                state.d.s = region;
                state.d.c = soldierCount(state, region);
                state.d.b[0].h = 0;
                state.d.h = region.n.concat(region);
            }
        } else if (region) {
            // we already have a move in progress
            var decisionState = state.d;
            // what region did we click?
            if (region == decisionState.s) {
                // the one we're moving an army from - tweak soldier count
                decisionState.c = decisionState.c % soldierCount(state, region) + 1;
            } else if (decisionState.s.n.indexOf(region) > -1) {
                // one of the neighbours - let's finalize the move
                uiCallbacks = {};
                decisionState.d = region;
                return reportMoveCallback(decisionState);
            } else {
                // some random region - cancel move
                setCleanState();
            }
        }
		updateDisplay(state);
	};

    uiCallbacks.t = function(region) {
        var temple = state.t[region.i];
        state.d = {
            t: BUILD_ACTION,
            w: temple, r: region,
            b: makeUpgradeButtons(temple)
        };
        updateDisplay(state);
    };

    uiCallbacks.s = function(soldier) {
        // delegate to the region click handler, after finding out which region it is
        var soldierRegion = null;
        map(state.r, function(region) {
            if (contains(state.s[region.i], soldier))
                soldierRegion = region;
        });
        if (soldierRegion)
            uiCallbacks.c(soldierRegion);
    };

	uiCallbacks.b = function(which) {
        if (state.d && state.d.t == BUILD_ACTION) {
            // build buttons handled here
            if (which >= UPGRADES.length) {
                setCleanState();
            } else {
                // build an upgrade!
                state.d.u = UPGRADES[which];
                // if its a soldier, store UI state so it can be kept after the move is made
                if (state.d.u == SOLDIER)
                    uiState[player.i] = state.d.r;
                // report the move
                reportMoveCallback(state.d);
            }
        } else {
            // move action buttons handled here
            if (which == 1) {
                // end turn
                uiCallbacks = {};
                reportMoveCallback({t: END_TURN});
            } else {
                // cancel move
                setCleanState();
            }
        }
	};

    uiCallbacks.un = function() {
        // undo!
        performUndo(state);
    };

    setCleanState();
    if (uiState[player.i]) {
        uiCallbacks.t(uiState[player.i]);
        delete uiState[player.i];
    }

    function setCleanState() {
		state.d = deepCopy(cleanState, 3);
        state.d.h = state.r.filter(regionHasActiveArmy.bind(0, state, player));
		updateDisplay(state);
	}

    function makeUpgradeButtons(temple) {
        var templeOwner = owner(state, temple.r);
        var upgradeButtons = map(UPGRADES, function(upgrade) {
            // current upgrade level (either the level of the temple or number of soldiers bought already)
            var level = (temple.u == upgrade) ? (temple.l+1) : ((upgrade == SOLDIER) ? (state.m.h || 0) : 0);

            var cost = upgrade.c[level];
            var text = template(upgrade.n, LEVELS[level]) + elem('b', {}, " (" + cost + "&#9775;)");
            var description = template(upgrade.d, upgrade.x[level]);

            var hidden = false;
            hidden = hidden || (upgrade == RESPEC && (!temple.u)); // respec only available if temple is upgraded
            hidden = hidden || (temple.u && temple.u != upgrade && upgrade != SOLDIER && upgrade != RESPEC); // the temple is already upgraded with a different upgrade
            hidden = hidden || (level >= upgrade.c.length); // highest level reached
            hidden = hidden || (level < rawUpgradeLevel(state, templeOwner, upgrade)); // another temple has this upgrade already
            hidden = hidden || (templeOwner != player); // we're looking at an opponent's temple

            return {t: text, d: description, o: cost > cash(state, player), h: hidden};
        });
        upgradeButtons.push({t: "Done"});
        return upgradeButtons;
    }
}

// ==========================================================
// This part of the code helps organize game flow so things are displayed
// in order taking animation into account.
// ==========================================================

var oaatQueue = [];
function oneAtATime(duration, fn) {
    oaatQueue.push({d: duration, f: fn});
    if (oaatQueue.length == 1)
        runOneTask();

    function runOneTask() {
        // start the first scheduled task
        var task = oaatQueue[0];
        task.f();
        // and wait for it to expire
        setTimeout(function() {
            // task done, remove from queue
            oaatQueue.shift();
            // is there something more to do?
            if (oaatQueue.length)
                runOneTask();
        }, task.d);
    }
}

// ==========================================================
// This part of the code deals with updating the display to
// match the current game state.
// ==========================================================

var soldierDivsById = {};
function updateMapDisplay(gameState) {
    map(gameState.r, updateRegionDisplay);
    forEachProperty(gameState.t, updateTempleDisplay);

    var soldiersStillAlive = [];
    forEachProperty(gameState.s, function(soldiers, regionIndex) {
        map(soldiers, updateSoldierDisplay.bind(0, gameState.r[regionIndex]));
    });

    forEachProperty(soldierDivsById, function(div, id) {
        if (soldiersStillAlive.indexOf(parseInt(id)) < 0) {
            // this is an ex-div - in other words, the soldier it represented is dead
            $('m').removeChild(div);
            delete soldierDivsById[id]; // surprisingly, this should be safe to do during iteration - http://stackoverflow.com/a/19564686

            // spawn some particles
            var x = parseFloat(div.style.left), y = parseFloat(div.style.top);
            map(range(0,20), function() {
                var angle = Math.random() * 6.28, dist = rint(0,100) / 80;
                spawnParticle(x + sin(angle) * dist, y + cos(angle) * dist, 0, -1, '#000');
            });
        }
    });

    updateFloatingText();
    updateTooltips();
    updateSoldierTooltips();

    function updateRegionDisplay(region) {
        var regionOwner = owner(gameState, region);
        var gradientName = (regionOwner ? 'p' + regionOwner.i : 'l');

        var highlighted = contains(gameState.d && gameState.d.h || [], region) ||    // a region is highlighted if it has an available move
                          (gameState.e && regionOwner == gameState.e);               // - or belongs to the winner (end game display highlights the winner)

        // highlighting
        if (highlighted) {
            gradientName += 'h';
        }
        var highlightedOpacity = 0.1 + region.c[0] * 0.003;
        if (gameState.e || (gameState.d && gameState.d.s == region))
            highlightedOpacity *= 2;
        region.hl.style.opacity = highlighted ? highlightedOpacity : 0.0;
        region.hl.style.cursor = highlighted ? 'pointer' : 'default';

        // particles
        if (gameState.prt == region) {
            gameState.prt = 0; // only once
            map(region.p, function(point) {
                point = projectPoint(point);
                var center = region.c;
                var alpha = rint(30,100)/100;
                var startPoint = [lerp(alpha,center[0],point[0]), lerp(alpha,center[1],point[1])];
                var vx = (startPoint[0]-center[0]) / 2, vy = (startPoint[1]-center[1]) / 2 - 0.15;
                spawnParticle(startPoint[0], startPoint[1], vx, vy, '#fff');
            });
        }

        // fill
        region.e.style.fill = 'url(#' + gradientName + ')';
    }

    function updateTooltips() {
        map(doc.querySelectorAll('.ttp'), $('m').removeChild.bind($('m')));
        if (activePlayer(gameState).u != uiPickMove) return;

        // "how to move" tooltips
        var source = gameState.d && gameState.d.s;
        if (source)  {
            showTooltipOver(source, "Click this region again to change the number of soldiers.");
            // pick the furthest neighbour
            var furthest = max(source.n, function(neighbour) {
                return Math.abs(source.c[0]-neighbour.c[0]) + Math.abs(source.c[1] - neighbour.c[1]);
            });
            showTooltipOver(furthest, "Click a bordering region to move.");
        }
        if (!source) {
            // "conquering armies cannot move" tooltips
            var inactiveArmies = gameState.m.z;
            if (inactiveArmies) {
                showTooltipOver(inactiveArmies[inactiveArmies.length-1], "Armies that conquer a new region cannot move again.")
                showTooltipOver({c: [-2, 80]}, "Once you're done, click 'End turn' here.");
            }
        }
        if (gameState.m.t == 2 && gameState.m.l == 2) {
            showTooltipOver({c:[90,93]}, "If you want to undo a move or check the rules, use the buttons here.", 15);
        }
    }

    function showTooltipOver(region, text, width) {
        if (gameSetup.tt[text]) return;
        setTimeout(function() {
            gameSetup.tt[text] = 1; // don't display it again (timeout to handle multiple updateDisplays() in a row)
            storeSetupInLocalStorage(gameSetup);
        }, 500);

        width = width || 7;
        var left = region.c[0] - (width+1) * 0.5, bottom = 102 - region.c[1];
        var styles = 'bottom: ' + bottom + '%; left: ' + left + '%; width: ' + width + '%';

        append('m', div({c: 'tt ttp', s: styles}, text));
    }

    function updateTempleDisplay(temple) {
        var element = temple.e;

        // right color and right number of levels (corresponding to upgrade level)
        var templeLevels = temple.u ? (temple.l + 3) : 2;
        while (element) {
            element.style.display = (templeLevels > 0) ? 'block' : 'none';
            element.style.background = temple.u ? temple.u.b : '#999';

            templeLevels--;
            element = element.firstChild;
        }

        // which cursor should we use?
        var templeOwner = owner(gameState, temple.r);
        temple.e.style.cursor = (appState == APP_INGAME) ? ((templeOwner == activePlayer(gameState)) ? 'zoom-in' : 'help') : 'default';

        // highlight?
        var selected = gameState.d && gameState.d.w == temple;
        toggleClass(temple.e, 'l', selected);
    }

    function updateSoldierDisplay(region, soldier, index) {
        // we're still alive, so no removing our <div>
        soldiersStillAlive.push(soldier.i);

        // find or create a <div> for showing the soldier
        var domElement = soldierDivsById[soldier.i];
        if (!domElement) {
            var html = div({c: 's', s: 'display: none'});

            domElement = soldierDivsById[soldier.i] = append('m', html);
            onClickOrTap(domElement, invokeUICallback.bind(0, soldier, 's'));
        }

        // (re)calculate where the <div> should be
        var center = region.c;
        var totalSoldiers = soldierCount(gameState, region);

        var columnWidth = min([totalSoldiers,4]);
        var rowHeight = min([2 / ceil(totalSoldiers / 4), 1]);

        var x = index % 4, y = floor(index / 4);
        var xOffset = (-0.6 * columnWidth + x * 1.2);
        var yOffset = y * rowHeight + (gameState.t[region.i] ? 1.5 : 0);
        var xPosition = center[0] + xOffset - yOffset * 0.2;
        var yPosition = center[1] + xOffset * 0.2 + yOffset;

        if (soldier.a) {
            // we're attacking right now - move us closer to target region
            var targetCenter = soldier.a.c;
            xPosition = (xPosition + targetCenter[0]) / 2;
            yPosition = (yPosition + targetCenter[1]) / 2;
        }
        domElement.style.left = xPosition + '%';
        domElement.style.top  = yPosition + '%';
        domElement.style.zIndex = 20 + y * 5 + x;
        domElement.style.display = 'block';

        // selected?
        var decisionState = gameState.d || {};
        toggleClass(domElement, 'l', (decisionState.s == region) && (index < decisionState.c));
    }

    function updateSoldierTooltips() {

        map(gameState.r, function(region, regionIndex) {
            var tooltipId = 'sc' + regionIndex;
            // delete previous tooltip, if present
            var tooltip = $(tooltipId);

            // should we have a tooltip?
            var count = soldierCount(gameState, region);
            if (count > 8) {
                var selected = (gameState.d && (gameState.d.s == region)) ? gameState.d.c : 0;
                selected += sum(gameState.s[regionIndex], function(soldier) {
                    return soldier.a ? 1 : 0;
                });
                if (selected)
                    count = selected + "<hr>" + count;

                if (!tooltip) {
                    var tooltipHTML = div({
                        i: tooltipId,
                        c: 'tt stt',
                        s: "left:" + (region.c[0] - 1.5) + '%;top:' + (region.c[1] + 1.2) + '%'
                    }, '');
                    tooltip = append('m', tooltipHTML);
                }
                tooltip.innerHTML = count;
            } else if (tooltip) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
    }

    function updateFloatingText() {
        map(gameState.flt || [], function(floater) {
            var x, y;
            if (floater.r) {
                x = floater.r.c[0]; y = floater.r.c[1];
            } else {
                var node = soldierDivsById[floater.s.i];
                x = parseFloat(node.style.left) + 0.2, y = parseFloat(node.style.top) + 0.2;
            }

            x -= floater.w/2 + 0.5; y -= 4;

            var styles = "left: " + x + "%;top:" + y + "%;color:" + floater.c + ";width:" + floater.w + "%";
            var floatingNode = append('m', div({c: 'tt', s: styles}, floater.t));
            setTransform(floatingNode, "translate3d(0,0,0)");
            floatAway(floatingNode, 0, -3);
        });
        gameState.flt = 0;
    }
}

function updateIngameUI(gameState) {
    var moveState = gameState.m;
    var decisionState = gameState.d;
    var buildingMode = decisionState && (decisionState.t == BUILD_ACTION);
    var movingArmy = decisionState && decisionState.s;

    var active = activePlayer(gameState);

    // turn counter/building name
    if (buildingMode) {
        var info = templeInfo(gameState, decisionState.w);
        $('tc').innerHTML = div({}, info.n) + div({c: 'ds'}, info.d);
    } else {
        $('tc').innerHTML = 'Turn <b>' + gameState.m.t + '</b>' + ((gameSetup.tc != UNLIMITED_TURNS) ? ' / ' + gameSetup.tc : '');
    }

    // player data
    map(gameState.p, function(player, index) {
        //$('pl' + index).className = (index == moveState.p) ? 'pl' : 'pi'; // active or not?
        var regions = regionCount(gameState, player);
        var gameWinner = gameState.e;

        if (regions) {
            $('pr' + index).innerHTML = regionCount(gameState, player) + '&#9733;'; // region count
            if (gameWinner) {
                $('pc' + index).innerHTML = (gameWinner == player) ? '&#9819;' : '';
            } else {
                $('pc' + index).innerHTML = gameState.c[player.i] + '&#9775;'; // cash on hand
            }
        } else {
            $('pr' + index).innerHTML = '&#9760;'; // skull and crossbones, you're dead
            $('pc' + index).innerHTML = '';
        }
    });

    // move info
    var info;
    if (active.u == uiPickMove) {
        if (buildingMode) {
            if (owner(gameState, decisionState.r) == active)
                info = elem('p', {}, 'Choose an upgrade to build.');
            else
                info = '';
        } else if (movingArmy) {
            info = elem('p', {}, 'Click on this region again to choose how many to move.') +
                elem('p', {}, 'Click on a target region to move the army.');

        } else {

            info = elem('p', {}, 'Click on a region to move or attack with its army.') +
                elem('p', {}, 'Click on a temple to buy soldiers or upgrades with &#9775;.');
        }
    } else {
        info = elem('p', {}, active.n + ' is taking her turn.');
    }
    $('in').innerHTML = info;
    $('in').style.background = active.d;

    // active player stats
    $('pd').style.display =  buildingMode ? 'none' : 'block';
    $('mc').innerHTML = moveState.l + elem('span', {s: 'font-size: 80%'}, '&#10138;');
    $('ft').innerHTML = gameState.c[active.i] +  elem('span', {s: 'font-size: 80%'}, '&#9775;');

    // buttons
    updateButtons(decisionState && decisionState.b);

    // undo
    $('und').innerHTML = undoEnabled(gameState) ? "&#x21b6;" : "";
}

function updateButtons(buttons) {
    $('u').innerHTML = '';
    map(buttons || [], function(button, index) {
        if (button.h) return;

        var buttonContents = div({}, button.t);
        if (button.d)
            buttonContents += div({c: 'ds'}, button.d);

        var buttonHTML = elem('a', {href: '#', c: button.o ? 'off' : ''}, buttonContents);
        var buttonNode = append('u', buttonHTML);
        if (!button.o) {
            onClickOrTap(buttonNode, invokeUICallback.bind(0, index, 'b'));
        }
    });
}

var displayedState;
function updateDisplay(gameState) {
    // just for debugging
    displayedState = gameState;

    // update the graphics
    updateMapDisplay(gameState);
    updateIngameUI(gameState);

    // make sounds!
    if (gameState.sc) {
        playSound(gameState.sc);
        gameState.sc = null;
    }
}

function showBanner(background, text, delay) {
    delay = delay || 1;
    oneAtATime(delay, function() {
        // create a new banner div
        var banner = append('c', div({c: 'bn'}, text)),
            styles = banner.style;

        styles.background = background;
        styles.opacity = 0.0;
        setTransform(banner, transform(-1));

        setTimeout(function() { styles.opacity = 1.0; setTransform(banner, transform(1)); }, 100),
        setTimeout(function() { styles.opacity = 1.0; }, 600),
        setTimeout(function() { styles.opacity = 0.0; }, 1100),
        setTimeout(function() { banner.parentNode.removeChild(banner); }, 1600)
    });

    function transform(offset) {
        return "translate3d(1.2em," + offset + "em,0) rotateY(" + (10 + offset * 2) + "deg)";
    }
}

function spawnParticle(x, y, vx, vy, color) {
    var styleString = "opacity:1;left: " + x + "%;top: " + y + "%;box-shadow: 0 0 1px 1px " + color;
    var particle = append('m', div({c: 'pr', s: styleString}, ''));
    floatAway(particle, vx, vy);
}

function floatAway(elem, vx, vy) {
    setTimeout(function() {
        setTransform(elem, "translate3d(" + vx + "em," + vy + "em,0)");
        elem.style.opacity = 0.0;
    }, 50);
    setTimeout(function() {
        $('m').removeChild(elem);
    }, 3050);
}

function preserveAspect() {
    setTimeout(function() {
        var w = wnd.innerWidth, h = wnd.innerHeight, aspect = 1.65, px = 'px';
        if (w / h > aspect) {
            w = h * aspect;
        } else {
            h = w / aspect;
        }

        var styles = $('c').style;
        styles.width = w + px;
        styles.height = h + px;
        styles.fontSize = 0.025 * h + px;
    }, 1);
}

// ==========================================================
// Preparing the initial game state happens here
// ==========================================================

function makeInitialState(setup) {
    var players = [];
    map(setup.p, function(playerController, playerIndex) {
        if (playerController == PLAYER_OFF) return;
        var player = deepCopy(PLAYER_TEMPLATES[playerIndex], 1);

        // set up as AI/human
        player.u = (playerController == PLAYER_HUMAN) ? uiPickMove : aiPickMove;
        // pick a random personality if we're AI
        if (playerController == PLAYER_AI) {
            player.p = deepCopy(AI_PERSONALITIES[rint(0, AI_PERSONALITIES.length)], 2);
        }

        player.i = players.length;
        players.push(player);
    });

	var regions = generateMap(players.length);
	var gameState = {
		p: players,
		r: regions,
		o: {}, t: {}, s: {}, c: {}, l: {},
		m: {t: 1, p: 0, m: MOVE_ARMY, l: movesPerTurn}
	};
	
	setupTemples();

	return gameState;



    function distance(regionA, regionB) {
        // breadth-first search!
        var queue = [{r: regionA, d:0}], visited = [regionA], answer = -1, bound = 100;

        while (answer < 0) {
            var item = queue.shift(), region = item.r, distanceFromA = item.d;
            if (region == regionB) {
                // we've found the region!
                answer = distanceFromA;
            } else if (distanceFromA >= bound) {
                // we've reached our established upper bound - return it
                answer = bound;
            } else {
                // use memoized values to establish an upper bound (we still might do better,
                // but we can't do worse)
                if (region.d[regionB.i])
                    bound = min([bound, region.d[regionB.i] + distanceFromA]);

                // look in all unvisited neighbours
                map(region.n, function (neighbour) {
                    if (!contains(visited, neighbour))
                        queue.push({r: neighbour, d: distanceFromA + 1});
                });
                visited.push(region);
            }
        }

        // memoize result for later and return
        regionA.d[regionB.i] = regionB.d[regionA.i] = answer;
        return answer;
    }

	function distanceScore(regions) {
		return min(pairwise(regions, distance));
	}

	function randomRegion() {
		return regions[rint(0, regions.length)];
	}
 
	function setupTemples() {
		// give the players some cash (or not)
		map(players, function(player, index) {
			gameState.c[index] = gameState.l[index] = 0;
		});

		// pick three regions that are as far away as possible from each other
		// for the players' initial temples
		var possibleSetups = map(range(0,1000), function() {
			return map(gameState.p, randomRegion);
		});
		var homes = max(possibleSetups, distanceScore);

		// we have the regions, set up each player
		map(players, function(player, index) {
			var region = homes[index];
			// make one of the regions your own
			gameState.o[region.i] = player;
			// put a temple and 3 soldiers in it
			putTemple(region, 3);
		});

		// setup neutral temples
        var distancesToTemples = map(homes, function() { return 0; });
        var templeRegions = [];
        var templeCount = [3,3,4][players.length-2];

		map(range(0,templeCount), function() {
			var bestRegion = max(gameState.r, function(region) {
				return templeScore(region);
			});

            putTemple(bestRegion, 3);

            templeRegions.push(bestRegion);
            distancesToTemples = updatedDistances(bestRegion);
		});

        function updatedDistances(newTemple) {
            return map(homes, function(home, index) {
                return distancesToTemples[index] + distance(home, newTemple);
            });
        }

        function templeScore(newTemple) {
            if (contains(templeRegions, newTemple))
                return -100;

            var updated = updatedDistances(newTemple);
            var inequality = max(updated) - min(updated);
            var templeDistances = distanceScore(templeRegions.concat(homes).concat(newTemple));
            if (!templeDistances)
                templeDistances = -5;

            return templeDistances - inequality;
        }
	}

	function putTemple(region, soldierCount) {
		var index = region.i;
		gameState.t[index] = {r: region, i: index};
		addSoldiers(gameState, region, soldierCount);
	}
}

// ==========================================================
// The AI running CPU players resides below.
// ==========================================================

function aiPickMove(player, state, reportMoveCallback) {
    // check for upgrade options first
    // start with soldiers
    if (shouldBuildSoldier(player, state)) {
        var move = buildSoldierAtBestTemple(player, state);
        return setTimeout(reportMoveCallback.bind(0,move), minimumAIThinkingTime);
    }

    // we don't need soldiers, maybe we can upgrade a temple?
    var upgrade = upgradeToBuild(player, state);
    if (upgrade) {
        return setTimeout(reportMoveCallback.bind(0, upgrade), minimumAIThinkingTime);
    }

    // the AI only analyzes its own moves (threats are handled in heuristic)
    var depth = state.m.l || 1;

    // use a min-max search to find the best move looking a few steps forward
    performMinMax(player, state, depth, reportMoveCallback);
}

function shouldBuildSoldier(player, state) {
    // do we have a temple to build it in?
    if (!temples(state, player).length)
        return false;

    // get preference for soldiers from our personality
    // if we don't want more upgrades, our preference becomes 1
    var soldierPreference = player.p.u.length ? player.p.s : 1;

    // calculate the relative cost of buying a soldier now
    var relativeCost = soldierCost(state) / state.c[player.i];
    if (relativeCost > 1)
        return false;

    // see how far behind on soldier number we are
    var forces = map(state.p, force.bind(0,state));
    var forceDisparity = max(forces) / force(state, player);

    // this calculates whether we should build now - the further we are behind
    // other players, the more likely we are to spend a big chunk of our cash
    // on it
    var decisionFactor = forceDisparity * soldierPreference - relativeCost;

    return decisionFactor >= 0;
}

function force(state, player) {
    return regionCount(state, player) * 2 + totalSoldiers(state, player);
}

function upgradeToBuild(player, state) {
    // do we still want something?
    if (!player.p.u.length)
        return;
    var desire = player.p.u[0];
    var currentLevel = rawUpgradeLevel(state, player, desire);
    // can we afford it?
    if (state.c[player.i] < desire.c[currentLevel])
        return;

    // do we have a place to build it?
    var possibleUpgrades = temples(state, player).filter(function(temple) {
        return ((!temple.u) && (!currentLevel)) || (temple.u == desire);
    });
    if (!possibleUpgrades.length)
        return;

    // pick the safest temple
    var temple = min(possibleUpgrades, templeDangerousness.bind(0, state));

    // build the upgrade!
    player.p.u.shift();
    return {t: BUILD_ACTION, u: desire, w: temple, r: temple.r};
}

function templeDangerousness(state, temple) {
    var templeOwner = owner(state, temple.r);
    return regionThreat(state, templeOwner, temple.r) +
           regionOpportunity(state, templeOwner, temple.r);
}

function buildSoldierAtBestTemple(player, state) {
    var temple = max(temples(state, player), templeDangerousness.bind(0, state));
    return {t: BUILD_ACTION, u: SOLDIER, w: temple, r: temple.r};
}

function minMaxDoSomeWork(node) {
    if (node.d == 0) {
        // terminal node, evaluate and return
        node.v = heuristicForPlayer(node.a, node.s);
        return minMaxReturnFromChild(node.p, node);
    }

    var move = node.u.shift();
    if (!move) {
        // we're done analyzing here, return value to parent
        return minMaxReturnFromChild(node.p, node);
    } else {
        // spawn a child node
        var childState = makeMove(node.s, move);
        return {
            p: node, a: node.a, d: node.d-1,
            m: move,
            s: childState, u: possibleMoves(childState)
        };
    }
}

function minMaxReturnFromChild(node, child) {
    if (node) {
        // what sort of a node are we?
        var activePlayer = node.s.p[node.s.m.p];
        var maximizingNode = activePlayer == node.a;
        // is the value from child better than what we have?
        var better = (!node.b) || (maximizingNode && (child.v > node.v)) || ((!maximizingNode) && (child.v < node.v));
        if (better) {
            node.b = child.m;
            node.v = child.v;
        }
    }

    // work will resume in this node on the next iteration
    return node;
}

function performMinMax(forPlayer, fromState, depth, moveCallback) {
    var simulation = copyState(fromState, forPlayer);
    var initialNode = {
        p: null, a: forPlayer, s: simulation, d: depth,
        u: possibleMoves(fromState)
    };
    var currentNode = initialNode;
    var unitOfWork = 100;
    var timeStart = now();

    setTimeout(doSomeWork, 1);

    function doSomeWork() {
        var stepsRemaining = unitOfWork;
        while (stepsRemaining--) {
            // do some thinking
            currentNode = minMaxDoSomeWork(currentNode);

            // cap thinking time
            var elapsedTime = now() - timeStart;
            if (elapsedTime > maximumAIThinkingTime) {
                currentNode = null;
            }

            if (!currentNode) {
                // we're done, let's see what's the best move we found!
                var bestMove = initialNode.b;
                if (!bestMove) {
                    bestMove = {t: END_TURN};
                }

                // perform the move (after a timeout if the minimal 'thinking time' wasn't reached
                // so that whatever the AI does is easy to understand
                setTimeout(moveCallback.bind(0, bestMove), max([minimumAIThinkingTime - elapsedTime, 1]));
                return;
            }
        }
        // schedule some more work, we're not done yet
        // but we want to let some events happen
        setTimeout(doSomeWork, 1);
    }
}

function possibleMoves(state) {
    // ending your turn is always an option
    var moves = [{t: END_TURN}];
    var player = activePlayer(state);

    // are we out of move points?
    if (!state.m.l)
        return moves; // yup, just end of turn available

    function addArmyMove(source, dest, count) {
        // add the move to the list, if it doesn't qualify as an obviously stupid one

        // suicide moves, for example:
        if ((owner(state, dest) != player) && (soldierCount(state, dest) > count))
            return;

        // not *obviously* stupid, add it to the list!
        moves.push({t: MOVE_ARMY, s: source, d: dest, c: count});
    }

    // let's see what moves we have available
    map(state.r, function(region) {
       if (regionHasActiveArmy(state, player, region)) {
           // there is a move from here!
           // iterate over all possible neighbours, and add two moves for each:
           // moving the entire army there, and half of it
           var soldiers = soldierCount(state, region);
           map(region.n, function(neighbour) {
               addArmyMove(region, neighbour, soldiers);
               if (soldiers > 1)
                   addArmyMove(region, neighbour, floor(soldiers / 2));
           });
       }
    });

    // return the list, shuffled (so there is no bias due to move generation order)
    shuffle(moves);
    return moves;
}

function slidingBonus(state, startOfGameValue, endOfGameValue, dropOffPoint) {
    var dropOffTurn = dropOffPoint * gameSetup.tc;
    var alpha = (state.m.t - dropOffTurn) / (gameSetup.tc - dropOffTurn);
    if (alpha < 0.0)
        alpha = 0.0;
    return (startOfGameValue + (endOfGameValue - startOfGameValue) * alpha);
}

function heuristicForPlayer(player, state) {
    var soldierBonus = slidingBonus(state, 0.25, 0, 0.83),
        threatOpportunityMultiplier = slidingBonus(state, 1.0, 0.0, 0.83);

    function adjustedRegionValue(region) {
        // count the value of the region itself
        var value = regionFullValue(state, region);
        // but also take into account the threat other players pose to it, and the opportunities it offers
        value += regionOpportunity(state, player, region) * threatOpportunityMultiplier -
                 regionThreat(state, player, region) * threatOpportunityMultiplier * value;
        // and the soldiers on it
        value += soldierCount(state, region) * soldierBonus;

        return value;
    }

    var regionTotal = sum(state.r, function (region) {
        return (owner(state, region) == player) ? adjustedRegionValue(region) : 0;
    });
    var faithTotal = income(state, player) * soldierBonus / 12; // each point of faith counts as 1/12th of a soldier
    return regionTotal + faithTotal;
}

function regionFullValue(state, region) {
    var temple = state.t[region.i];
    if (temple) {
        var templeBonus = slidingBonus(state, 6, 0, 0.5);
        var upgradeBonus = slidingBonus(state, 4, 0, 0.9);
        var upgradeValue = temple.u ? (temple.l + 1) : 0;
        return 1 + templeBonus + upgradeBonus * upgradeValue;
    } else {
        return 1;
    }
}

function regionThreat(state, player, region) {
    var aiLevel = gameSetup.l;
    if (gameSetup.l == AI_NICE) return 0; // 'nice' AI doesn't consider threat

    var ourPresence = soldierCount(state, region);
    var enemyPresence = max(map(region.n, function(neighbour) {
        // is this an enemy region?
        var nOwner = owner(state, neighbour);
        if ((nOwner == player) || !nOwner) return 0;

        // count soldiers that can reach us in 3 moves from this direction
        // using a breadth-first search
        var depth = (aiLevel == AI_RUDE) ? 0 : 2; // 'rude' AI only looks at direct neighbours, harder AIs look at all soldiers that can reach us
        var queue = [{r: neighbour, d: depth}], visited = [];
        var total = 0;
        while (queue.length) {
            var entry = queue.shift();
            total += soldierCount(state, entry.r) * ((aiLevel > AI_RUDE) ? (2 + entry.d) / 4 : 1); // soldiers further away count for less (at least if your AI_MEAN)
            visited.push(entry.r);

            if (entry.d) {
                // go deeper with the search
                map(entry.r.n.filter(function(candidate) {
                    return (!contains(visited, candidate)) &&
                        (owner(state, candidate) == nOwner);
                }), function(r) {
                    queue.push({r: r, d: entry.d-1});
                });
            }
        }

        return total;
    }));
    return clamp((enemyPresence / (ourPresence+0.0001) - 1) / 1.5, 0, (aiLevel == AI_RUDE) ? 0.5 : 1.1);
}

function regionOpportunity(state, player, region) {
    // the 'nice' AI doesn't see opportunities
    if (gameSetup.l == AI_NICE) return 0;

    // how much conquest does this region enable?
    var attackingSoldiers = soldierCount(state, region);
    if (!attackingSoldiers)
        return 0;

    return sum(region.n, function(neighbour) {
        if (owner(state, neighbour) != player) {
            var defendingSoldiers = soldierCount(state, neighbour);
            return clamp((attackingSoldiers / (defendingSoldiers + 0.01) - 0.9) * 0.5, 0, 0.5) * regionFullValue(state, neighbour);
        } else {
            return 0;
        }
    });
}

// ==========================================================
// All the game logic and the machinery that runs its main
// loop reside below.
// ==========================================================

/**
 * Asks the UI (for humans) or the AI (for CPU players) to pick
 * the next move to make in the game. This happens asynchronously.
 *
 * @param player the player to move
 * @param state the state in which to make the move
 * @param reportMoveCallback should be called with the desired move as parameter once the decision is made
 */
function pickMove(player, state, reportMoveCallback) {
    // automatically end the turn of dead players
    if (!regionCount(state, player))
        return reportMoveCallback({t: END_TURN});

	// delegate to whoever handles this player
    player.u(player, state, reportMoveCallback);
}

/**
 * Takes an existing state and a move, and returns a new game state with the move
 * already applied. The object returned is a copy and the original is left untouched.
 *
 * @param state an existing game state
 * @param move the move to be applied by the active players
 * @returns {GameState} the game state after this move
 */
function makeMove(state, move) {
	state = copyState(state);
	
	var moveType = move.t;
	if (moveType == MOVE_ARMY) {
        moveSoldiers(state, move.s, move.d, move.c);
    } else if (moveType == BUILD_ACTION) {
        buildUpgrade(state, move.r, move.u);
	} else if (moveType == END_TURN) {
		nextTurn(state);
	}

    // updates that happen after each move (checking for players losing, etc.)
    afterMoveChecks(state);

	return state;
}

function copyState(state, simulatingPlayer) {
	return {
		// some things are constant and can be shallowly copied
		r: state.r, 
		p: state.p,
        a: state.a || simulatingPlayer,
		// some others... less so
		m: deepCopy(state.m, 1),
		o: deepCopy(state.o, 1),
		t: deepCopy(state.t, 2),
		s: deepCopy(state.s, 3),
		c: deepCopy(state.c, 1),
        l: deepCopy(state.l, 1),
        flt: state.flt
		// and some others are completely omitted - namely 'd', the current 'move decision' partial state
	};
}

function playOneMove(state) {
    // we're playing the game now
    appState = APP_INGAME;

    // oneAtATime is used to ensure that all animations from previous moves complete before a new one is played
    oneAtATime(150, function() {
        var controllingPlayer = activePlayer(state); // who is the active player to make some kind of move?

        // let the player pick their move using UI or AI
        pickMove(controllingPlayer, state, function(move) {
            // AI makes sounds when playing
            if (controllingPlayer.u == aiPickMove)
                playSound(audioClick);

            // the move is chosen - update state to a new immutable copy
            var newState = makeMove(state, move);
            // did the game end?
            if (newState.e) {
                // yes, the game has ended
                oneAtATime(150, updateDisplay.bind(0, newState));
                showEndGame(newState);
                return;
            } else {
                // remember state for undo purposes
                previousState = copyState(state);
                // still more of the game to go - next move, please!
                setTimeout(playOneMove.bind(0, newState), 1);
            }
        });

        // update display before the move happens
        updateDisplay(state);
    });
}

function afterMoveChecks(state) {
    // check for game loss by any of the players
    map(state.p, function(player) {
        var totalSoldiers = sum(state.r, function(region) {
            return owner(state, region) == player ? soldierCount(state, region) : 0;
        });
        if (!totalSoldiers && regionCount(state, player)) {
            // lost!
            forEachProperty(state.o, function(p, r) {
                if (player == p)
                    delete state.o[r];
            });
            // dead people get no more moves
            if (activePlayer(state) == player)
                state.m.l = 0;
            // show the world the good (or bad) news
            if (!state.a) {
                oneAtATime(150, updateDisplay.bind(0, state));
                showBanner('#222', player.n + " has been eliminated!", 900);
            }
        }
    });

    // do we still have more than one player?
    var gameStillOn = state.p.filter(regionCount.bind(0, state)).length > 1;
    if (!gameStillOn) {
        // oh gosh, it's done - by elimination!
        state.e = determineGameWinner(state);
        return;
    }
}

var soldierCounter;
function addSoldiers(state, region, count) {
    map(range(0,count), function() {
        soldierCounter = (soldierCounter + 1) || 0;

        var soldierList = state.s[region.i];
        if (!soldierList)
            soldierList = state.s[region.i] = [];

        soldierList.push({
            i: soldierCounter++
        });
    });
}

function moveSoldiers(state, fromRegion, toRegion, incomingSoldiers) {
	var fromList = state.s[fromRegion.i];
	var toList = state.s[toRegion.i] || (state.s[toRegion.i] = []);
	var fromOwner = owner(state, fromRegion);
	var toOwner = owner(state, toRegion);

	// do we have a fight?
	if (fromOwner != toOwner) {
        var defendingSoldiers = toList.length;

        // earth upgrade - preemptive damage on defense
        var preemptiveDamage = min([incomingSoldiers, upgradeLevel(state, toOwner, EARTH)]);
        var invincibility = upgradeLevel(state, fromOwner, FIRE);

        if (preemptiveDamage || defendingSoldiers) {
            // there will be a battle - move the soldiers halfway for animation
            if (!state.a) {
                map(fromList.slice(0, incomingSoldiers), function (soldier) {
                    soldier.a = toRegion;
                });
            }
            battleAnimationKeyframe(state);
        }

        if (preemptiveDamage) {
            // animate it
            battleAnimationKeyframe(state, 50, audioOursDead, [{s: fromList[0], t: "Earth kills " + preemptiveDamage + "!", c: EARTH.b, w: 9}]);
            // apply it
            map(range(0, preemptiveDamage), function () {
                fromList.shift();
                incomingSoldiers--;
            });
            battleAnimationKeyframe(state);
        }

        // if there is still defense and offense, let's have a fight
		if (defendingSoldiers && incomingSoldiers) {
            // at this point, the outcome becomes random - so you can't undo your way out of it
            state.u = 1;

            var incomingStrength = incomingSoldiers * (1 + upgradeLevel(state, fromOwner, FIRE) * 0.01);
            var defendingStrength = defendingSoldiers * (1 + upgradeLevel(state, toOwner, EARTH) * 0.01);

			var repeats = min([incomingSoldiers, defendingSoldiers]);
			var attackerWinChance = 100 * Math.pow(incomingStrength / defendingStrength, 1.6);

            function randomNumberForFight(index) {
                var maximum = 120 + attackerWinChance;
                if (state.a) {
                    // simulated fight - return some numbers
                    // they're clustered about the center of the range to
                    // make the AI more "decisive" (this exaggerates any advantages)
                    return (index + 3) * maximum / (repeats + 5);
                } else {
                    // not a simulated fight - return a real random number
                    // we're not using the full range 0 to maximum to make sure
                    // that randomness doesn't give a feel-bad experience when
                    // we attack with a giant advantage
                    return rint(maximum * 0.12, maximum * 0.88);
                }
            }

            map(range(0,repeats), function(index) {
				if (randomNumberForFight(index) <= 120)
                {
                    // defender wins!
                    if (invincibility-- <= 0) {
                        fromList.shift();
                        incomingSoldiers--;
                        battleAnimationKeyframe(state, 250, audioOursDead);
                    } else {
                        battleAnimationKeyframe(state, 800, audioOursDead, [{s: fromList[0], t: "Protected by Fire!", c: FIRE.b, w: 11}]);
                    }
                } else {
                    // attacker wins, kill defender and pay the martyr bonus
                    toList.shift();
                    if (toOwner)
                        state.c[toOwner.i] += 4;
                    battleAnimationKeyframe(state, 250, audioEnemyDead);
                }
			});

            // are there defenders left?
            if (toList.length) {
                // and prevent anybody from moving in
                incomingSoldiers = 0;
                state.sc = audioDefeat;
                state.flt = [{r: toRegion, c: toOwner ? toOwner.h : '#fff', t: "Defended!", w: 7}];
            }
		}

        // reset "attacking status" on the soldiers - at this point they will
        // move back to the source region or occupy the destination
        map(fromList, function(soldier) {
            soldier.a = 0;
        });
	}

	if (incomingSoldiers > 0) {
		// move the (remaining) soldiers
		map(range(0, incomingSoldiers), function() {
			toList.push(fromList.shift());
		});

		// if this didn't belong to us, it now does
        if (fromOwner != toOwner) {
            state.o[toRegion.i] = fromOwner;
            // mark as conquered to prevent moves from this region in the same turn
            state.m.z = (state.m.z || []).concat(toRegion);
            // if there was a temple, reset its upgrades
            var temple = state.t[toRegion.i];
            if (temple)
                delete temple.u;
            // play sound, launch particles!
            state.prt = toRegion;
            state.flt = [{r: toRegion, c: fromOwner.h, t: "Conquered!", w: 7}];
            state.sc = defendingSoldiers ? audioVictory : audioTakeOver;
        }
    }

	// use up the move
    state.m.l--;
}

function battleAnimationKeyframe(state, delay, soundCue, floatingTexts) {
    if (state.a) return;
    var keyframe = copyState(state);
    keyframe.sc = soundCue;
    keyframe.flt = floatingTexts;
    oneAtATime(delay || 500, updateDisplay.bind(0, keyframe));
}

function buildUpgrade(state, region, upgrade) {
    var temple = state.t[region.i];
    var templeOwner = owner(state, region);

    if (upgrade == SOLDIER) {
        // soldiers work diferently - they get progressively more expensive the more you buy in one turn
        if (!state.m.h)
            state.m.h = 0;
        state.c[templeOwner.i] -= upgrade.c[state.m.h++];
        return addSoldiers(state, region, 1);
    }
    if (upgrade == RESPEC) {
        // respeccing is also different
        delete temple.u;
        return;
    }

    // upgrade the temple
    if (temple.u != upgrade) {
        // fresh level 1 upgrade!
        temple.u = upgrade;
        temple.l = 0;
    } else {
        // upgrade to a higher level
        temple.l++;
    }

    // you have to pay for it, unfortunately
    state.c[templeOwner.i] -= upgrade.c[temple.l];

    // particles!
    state.prt = temple.r;

    // the AIR upgrade takes effect immediately
    if (upgrade == AIR)
        state.m.l++;
}

function nextTurn(state) {
	var player = activePlayer(state);
	
	// cash is produced
    var playerIncome = income(state, player);
    state.c[player.i] += playerIncome;
    if (playerIncome) {
        state.flt = [{r: temples(state, player)[0].r, t: "+" + playerIncome + "&#9775;", c: '#fff', w: 5}];
    }

	// temples produce one soldier per turn automatically
	forEachProperty(state.t, function(temple, regionIndex) {
		if (state.o[regionIndex] == player) {
			// this is our temple, add a soldier of the temple's element
			addSoldiers(state, temple.r, 1);
		}
	});

	// go to next player (skipping dead ones)
    do {
        var playerCount = state.p.length;
        var playerIndex = (state.m.p + 1) % playerCount, upcomingPlayer = state.p[playerIndex],
            turnNumber = state.m.t + (playerIndex ? 0 : 1);
        state.m = {t: turnNumber, p: playerIndex, m: MOVE_ARMY, l: movesPerTurn + upgradeLevel(state, upcomingPlayer, AIR)};
    } while (!regionCount(state, upcomingPlayer));

    // did the game end by any chance?
    if (state.m.t > gameSetup.tc) {
        // end the game!
        state.m.t = gameSetup.tc;
        state.e = determineGameWinner(state);
        return;
    }

    // if this is not simulated, we'd like a banner
    if (!state.a) {
        // show next turn banner
        showBanner(activePlayer(state).d, activePlayer(state).n + "'s turn");
    }
}

function determineGameWinner(state) {
    var pointsFn = regionCount.bind(0, state);
    var winner = max(state.p, pointsFn);
    var otherPlayers = state.p.filter(function(player) { return player != winner; });
    var runnerUp = max(otherPlayers, pointsFn);

    return (pointsFn(winner) != pointsFn(runnerUp)) ? winner : DRAW_GAME;
}

function showEndGame(state) {
    oneAtATime(1, function() {
        var winner = state.e;
        if (winner != DRAW_GAME) {
            showBanner(winner.d, winner.n + " wins the game!");
        } else {
            showBanner('#333', "The game ends in a draw!");
        }

        updateDisplay(state);

        $('tc').innerHTML = "Game complete";
        $('in').innerHTML = elem('p', {}, "Click the button below to start a new game.");
        $('in').style.background = '#555';
        $('mv').style.display = 'none';
        updateButtons([{t: "New game"}]);

        uiCallbacks.b = runSetupScreen;
    });
}

// ==========================================================
// Various simple helpers for working with the game state.
// ==========================================================

function soldierCount(state, region) {
	var list = state.s[region.i];
	return list ? list.length : 0;
}

function income(state, player) {
    // no income with no temples
    var playerTemples = temples(state,player);
    if (!playerTemples.length) return 0;

    // 1 faith per region
    var fromRegions = regionCount(state, player);
    // 1 faith per each soldier at temple (too much?)
    var fromTemples = sum(playerTemples, function(temple) {
        return soldierCount(state, temple.r);
    });
    var multiplier = 1.0 + 0.01 * upgradeLevel(state, player, WATER);
    if ((player.u == aiPickMove) && (gameSetup.l == AI_EVIL))
        multiplier += 0.4;
    return ceil(multiplier * (fromRegions + fromTemples));
}

function regionHasActiveArmy(state, player, region) {
    return (state.m.l > 0) && (owner(state, region) == player) && soldierCount(state, region) && (!contains(state.m.z, region));
}

function regionCount(state, player) {
	var total = 0;
	map(state.r, function(region) {
		if (owner(state, region) == player)
			total++;
	});
	return total;
}

function temples(state, player) {
    var temples = [];
    forEachProperty(state.t, function(temple, regionIndex) {
        if (state.o[regionIndex] == player)
            temples.push(temple);
    });
    return temples;
}

function activePlayer(state) {
    return state.p[state.m.p];
}

function owner(state, region) {
    return state.o[region.i];
}

function cash(state, player) {
    return state.c[player.i];
}

function rawUpgradeLevel(state, player, upgradeType) {
    return max(map(temples(state, player), function(temple) {
        if (temple.u && temple.u == upgradeType)
            return temple.l + 1;
        else
            return 0;
    }).concat(0));
}

function upgradeLevel(state, player, upgradeType) {
    if (!player) {
        // neutral forces always have upgrade level 0;
        return 0;
    }

    return max(map(state.r, function(region) {
        // does it have a temple?
        var temple = state.t[region.i];
        if (!temple) return 0;
        // does it belong to us?
        if (owner(state, region) != player) return 0;
        // does it have the right type of upgrade?
        return (temple.u == upgradeType) ? upgradeType.x[temple.l] : 0;
    }));
}

function totalSoldiers(state, player) {
    return sum(state.r, function(region) {
        return (owner(state, region) == player) ? soldierCount(state, region) : 0;
    });
}

function soldierCost(state) {
    return SOLDIER.c[state.m.h || 0];
}

function templeInfo(state, temple) {
    if (!temple.u) {
        var name = owner(state, temple.r) ? "Basic Temple" : "Neutral Temple";
        return {n: name, d: "No upgrades."};
    } else {
        var upgrade = temple.u, level = temple.l,
            description = template(upgrade.d, upgrade.x[level]);
        return {n: template(upgrade.n, LEVELS[level]), d: description};
    }
}

// ==========================================================
// Undo functionality
// ==========================================================

var previousState = null;

function undoEnabled(gameState) {
    return previousState && // there is a state to return to
        (activePlayer(previousState) == activePlayer(gameState)) &&  // and it was actually our move
        (!gameState.u) && // and undo wasn't expressly disabled after a battle
        (activePlayer(gameState).u == uiPickMove); // and no using Undo on behalf of the AI!
}

function performUndo(currentState) {
    if (!undoEnabled(currentState))
        return;

    // clear the callbacks from previous UI interaction
    uiCallbacks = {};

    // roll back the state to "previous"
    var restoredState = previousState;
    previousState = null;
    playOneMove(restoredState);
}

// ==========================================================
// This is the code for the game setup screen.
// ==========================================================

var defaultSetup = {
    p: [PLAYER_HUMAN, PLAYER_AI, PLAYER_AI, PLAYER_OFF],
    l: AI_NICE,
    s: true,
    tc: 12,
    tt: {}
};
var gameSetup = getSetupFromStorage();
var appState = 0;

// Gets user preferences from local storage, or returns false if there aren't any.
function getSetupFromStorage() {
    if (localStorage) {
        var stored = localStorage.getItem("s");
        if (stored) {
            stored = JSON.parse(stored);
            forEachProperty(defaultSetup, function (value, name) {
                if (stored[name] === undefined)
                    stored[name] = value;
            });
            return stored;
        }
    }

    return defaultSetup;
}

// Tries to store user preferences in local storage.
function storeSetupInLocalStorage() {
    if (localStorage) {
        localStorage.setItem("s", JSON.stringify(gameSetup));
    }
}

function prepareSetupUI() {
    // player box area
    var html = div({c: 'sc ds'}, "Player setup");
    var playerBoxes = map(PLAYER_TEMPLATES, function(player) {
        var pid = player.i;
        return buttonPanel(player.n, "sb" + player.i, ["AI", "Human", "Off"], {
            i: 'pl' + pid,
            c: 'pl',
            s: 'background: ' + player.d
        });
    }).join("");
    html += div({i: 'pd', c: 'sc un'}, playerBoxes);
    html += buttonPanel("AI", "ai", ["Evil", "Mean", "Rude", "Nice"]);
    html += buttonPanel("Turns", "tc", ["Endless", "15", "12", "9"]);

    // realize the UI
    $('d').innerHTML = html;

    // hide stat box and undo button
    map(['mv', 'und', 'end'], hide);

    // setup callbacks for players
    for2d(0, 0, PLAYER_TEMPLATES.length, 3, function(playerIndex, buttonIndex) {
        onClickOrTap($('sb' + playerIndex + buttonIndex), invokeUICallback.bind(0, {p: playerIndex, b: buttonIndex}, 'sb'));
    });
    map(range(0,4), function(index) {
        onClickOrTap($('ai' + index), invokeUICallback.bind(0, index, 'ai'));
        onClickOrTap($('tc' + index), invokeUICallback.bind(0, TURN_COUNTS[index], 'tc'));
    });

    function buttonPanel(title, buttonIdPrefix, buttonLabels, additionalProperties) {
        var buttons = map(buttonLabels, function(label, index) {
            var id = buttonIdPrefix + (buttonLabels.length-1-index);
            return elem('a', {i: id, c: 'rt', href: '#', s: 'font-size: 90%'}, label);
        }).join("");
        var properties = {c: 'sc ds', s: 'padding-right: 0.5em'};
        forEachProperty(additionalProperties, function(value, name) {
            properties[name] = value;
        });
        return div(properties, title + buttons);
    }
}

function runSetupScreen() {
    // we're in setup now
    appState = APP_SETUP_SCREEN;

    // generate initial setup and game state
    var game;
    regenerateMap();

    // prepare UI
    prepareSetupUI();
    updateBottomButtons();
    updateConfigButtons();

    // callback for the buttons on the bottom
    uiCallbacks.b = function(which) {
        if (!setupValid()) return;
        if (which == 0) {
            regenerateMap();
        } else {
            prepareIngameUI(game);
            updateDisplay(game);
            playOneMove(game);
        }
    };
    // callback for player setup buttons
    uiCallbacks.sb = function(event) {
        // set the controller type for the player
        gameSetup.p[event.p] = event.b;
        updateConfigButtons();
        updateBottomButtons();
        regenerateMap();
    };
    // callback for config buttons
    uiCallbacks.ai = function(aiLevel) {
        gameSetup.l = aiLevel;
        updateConfigButtons();
    };
    uiCallbacks.tc = function(turnCount) {
        gameSetup.tc = turnCount;
        updateConfigButtons();
    };

    function setupValid() {
        var enabledPlayers = sum(gameSetup.p, function(playerState) {
            return (playerState != PLAYER_OFF) ? 1 : 0;
        });
        return enabledPlayers > 1;
    }

    function updateBottomButtons() {
        var buttonsDisabled = !setupValid();
        updateButtons([
            {t: "Change map", o: buttonsDisabled},
            {t: "Start game", o: buttonsDisabled}
        ]);
    }

    function updateConfigButtons() {
        // somebody changed something, so store the new setup
        storeSetupInLocalStorage(gameSetup);

        // update player buttons
        map(gameSetup.p, function(controller, playerIndex) {
           map(range(0,3), function(buttonIndex) {
               toggleClass('sb' + playerIndex + buttonIndex, 'sl', (controller == buttonIndex));
           })
        });

        // update AI and turn count buttons
        map(range(0,4), function(index) {
            toggleClass('ai' + index, 'sl', index == gameSetup.l);
            toggleClass('tc' + index, 'sl', TURN_COUNTS[index] == gameSetup.tc);
        });
    }

    function regenerateMap() {
        if (setupValid()) {
            game = makeInitialState(gameSetup);
            showMap($('m'), game);
            updateMapDisplay(game);
        }
    }
}

// ==========================================================
// This part of the code is responsible for the meager functionality
// of the title screen.
// ==========================================================

function setupTitleScreen() {
    map(['o','tub','snd'], function(id) {showOrHide(id,1);});

    onClickOrTap($('cb'), setTitleScreenVisibility.bind(0,false));
    onClickOrTap($('nxt'), switchTutorialCard.bind(0,1));
    onClickOrTap($('prv'), switchTutorialCard.bind(0,-1));

    onClickOrTap($('tub'), setTitleScreenVisibility.bind(0,true));
    onClickOrTap($('snd'), toggleSound);
    onClickOrTap($('und'), invokeUICallback.bind(0, 0, 'un'));
    onClickOrTap($('end'), function() {
        uiCallbacks = {};
        updateDisplay(displayedState);
        runSetupScreen();
    });

    switchTutorialCard(0);

    setTimeout(setTitleScreenVisibility.bind(0,true), 10);
}

var currentCard = 0, totalCards = 5;
function switchTutorialCard(direction) {
    currentCard = clamp(currentCard + direction, 0, totalCards-1);

    setTransform($('tuc'), "translate3d(" + (-currentCard * 100 / totalCards) + "%,0,0)");
    showOrHide('prv', currentCard > 0);
    showOrHide('nxt', currentCard < totalCards - 1);
}

function setTitleScreenVisibility(visible) {
    if (visible) {
        $('ts').style.display = 'block';
    }

    setTimeout(function() {
        toggleClass('ts', 'h', !visible);
    }, 50);

    if (!visible) {
        setTimeout(function () {
            $('ts').style.display = 'none';
        }, 500);
    }
}

// ==========================================================
// This part of the code does audio.
// ==========================================================

function lerp(alpha, from, to) {
    alpha = clamp(alpha, 0, 1);
    return to * alpha + from * (1 - alpha);
}
function adsr(a, d, s, r, sl, fn) {
    var t = 0.0;
    return function(dt) {
        var f = fn(dt);
        t += dt;

        if (t < a)
            return lerp(t / a, 0, 1) * f;
        if (t < a+d)
            return lerp((t-a) / d, 1, sl) * f;
        if (t < a+d+s)
            return sl * f;
        return lerp((t-a-s-d) / r, sl, 0) * f;
    }
}

function wSin(pitch) {
    var t = 0.0;
    return function(dt) {
        t += dt;
        return Math.sin(t * pitch * 6.283);
    }
}

function wSlide(from, to, time, fn) {
    var t = 0.0;
    return function(dt) {
        t += dt;
        var passedDT = dt * lerp(t / time, from, to);
        return fn(passedDT);
    }
}

function wRamp(from, to, after, fn) {
    var t = 0.0;
    return function(dt) {
        t += dt;
        return fn(t > after ? dt * to : dt * from);
    }
}

function wNotes(notes) {
    map(notes, function(note) {
        note.f = adsr(0.01, 0.03, 0.03 * note.d, 0.03 * note.d, 0.7, wSin(note.p));
    });
    var t = 0.0;
    return function(dt) {
        t += dt;
        var v = 0.0;
        map(notes, function(note) {
            if (t >= note.t)
                v += note.f(dt);
        });
        return v;
    }
}

function makeBuffer(fn, len, vol) {
    var vol = vol || 1;

    var sampleRate = audioCtx.sampleRate;
    var samples = sampleRate * len;
    var buffer = audioCtx.createBuffer(1, samples, sampleRate);

    var dt = 1 / sampleRate;
    var bufferData = buffer.getChannelData(0);
    for (var i = 0; i < samples; i++) {
        bufferData[i] = fn(dt) * vol;
    }

    return buffer;
}

var audioCtx = window.AudioContext && (new AudioContext());
var audioClick, audioEnemyDead, audioOursDead, audioVictory, audioDefeat, audioTakeOver;
function setupAudio() {
    // do we have WebAudio?
    if (!audioCtx)
        return;

    // generate sounds
    audioClick = makeBuffer(adsr(0.01, 0.03, 0.01, 0.01, 0.2,
        wSin(110)
    ), 0.1);
    audioEnemyDead = makeBuffer(adsr(0.01, 0.05, 0.05, 0.05, 0.5,
        wSlide(1.0, 0.3, 0.1, wSin(300))
    ), 0.2, 0.6);
    audioOursDead = makeBuffer(adsr(0.01, 0.05, 0.05, 0.05, 0.5,
        wSlide(1.0, 0.3, 0.1, wSin(200))
    ), 0.2, 0.6);
    audioTakeOver = makeBuffer(wNotes([
        {t:0, p:261,d:1},{t:0.1, p:329, d:2}     // C-E
    ]), 0.6, 0.2);
    audioVictory = makeBuffer(wNotes([
        {t:0, p:261,d:1},{t:0.0, p:329, d:2},{t:0.0, p:392, d:3},     // C-E-G
        {t:0.2, p:261,d:1},{t:0.2, p:349, d:2},{t:0.2, p:440, d:3}    // C-F-A
    ]), 0.6, 0.2);
    audioDefeat = makeBuffer(wNotes([
        {t:0, p:392,d:3},{t:0.15, p:329, d: 2}, {t:0.3, p:261, d:1}
    ]), 0.6, 0.2);

    // update the mute button
    updateSoundControls();
}

function playSound(sound) {
    if (!(sound && gameSetup.s))
        return;

    var source = audioCtx.createBufferSource();
    source.buffer = sound;
    source.connect(audioCtx.destination);
    source.start();
}

function updateSoundControls() {
    $('snd').innerHTML = gameSetup.s ? '♪' : ' ';
    storeSetupInLocalStorage(gameSetup);
}

function toggleSound() {
    gameSetup.s = !gameSetup.s;
    updateSoundControls();
}

// ==========================================================
// This part of the code initalizes a new game.
// ==========================================================

// keep the aspect of the gameplay area correct
(wnd.onresize = preserveAspect)();

// start the game
window.onload = function() {
    setTimeout(function() {
        gameSetup = getSetupFromStorage();
        setupAudio();
        runSetupScreen();
        setupTitleScreen();
    }, 500);
};

