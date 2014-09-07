// ==========================================================
// Map generation and rules constants
// ==========================================================

var mapWidth = 30, 
	mapHeight = 20, 
	maxRegionSize = 8,
	neededRegions = 22,
	movesPerTurn = 3,
	turnCount = 12;

// ==========================================================
// Game data
// ==========================================================

// === The possible move types
var MOVE_ARMY = 1, BUILD_ACTION = 2, END_TURN = 3;

// === Possible temple upgrades
var UPGRADES = [
    {n: "Believer", d: "", c: map(range(0,100), function(n) { return 8 + n *2; }), x: []},
    {n: "X of Water", d: "Income per turn X% higher.",
        c: [15, 30, 45], x: [25, 50, 75],
        b: '#66f'},
    {n: "X of Earth", d: "Army X% better at defense.",
        c: [25, 50, 75], x: [15, 30, 50],
        b: '#696'},
    {n: "X of Fire",  d: "Army X% better at offense.",
        c: [30, 60, 90], x: [15, 30, 50],
        b: '#f88'},
    {n: "X of Air",   d: "X additional move(s) per turn.",
        c: [40, 80, 120], x: [1,2,3],
        b: '#ffa'}
    ],
    LEVELS = ["Temple", "Cathedral", "House"],
    SOLDIER = UPGRADES[0], WATER = UPGRADES[1], EARTH = UPGRADES[2], FIRE = UPGRADES[3], AIR = UPGRADES[4];

// === Constants for setup screen
var PLAYER_CPU = 0, PLAYER_HUMAN = 1, PLAYER_OFF = 2;

// == Special "player" for singifying a draw game
var DRAW_GAME = {};

// ==========================================================
// Helper functions used for brevity or convenience.
// ==========================================================

var sin = Math.sin, 
	cos = Math.cos, 
	
	wnd = window, 
	doc = document, 

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

function $(id) {
    return doc.querySelector('#' + id);
}

function elem(tag,attrs,contents) {
	var expanded = {
		c: 'class',
		s: 'style',
		i: 'id'
	};
	var html = '<' + tag + ' ';
	for (var attributeName in attrs) {
		html += (expanded[attributeName] || attributeName) + "='" + attrs[attributeName] + "'";
	}
	html += '>' + (contents || '') + '</' + tag + '>';

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
function max(seq, key) {
    key = key || identity;
    return min(seq, function(elem) { return -key(elem); })
}

function sum(seq, key) {
    var total = 0;
    map(seq, function(elem){
        total += key(elem);
    });
    return total;
}

function contains(seq, elem) {
    return seq && (seq.indexOf(elem) >= 0);
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

function shuffle(seq) {
    map(seq, function(_, index) {
        var otherIndex = rint(index, seq.length);
        var t = seq[otherIndex];
        seq[otherIndex] = seq[index];
        seq[index] = t;
    });
    return seq;
}

function clamp(number, low, high) {
    return (number < low) ? low : ((number > high) ? high : number);
}

function now() {
    return Date.now();
}

function template(text, replacement) {
    return text.replace(/X/g, replacement);
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

function showMap(container, gameState) {
    var regions = gameState.r;

    // define gradients for rendering
    var defs = elem('defs', {},
            makeGradient('b', '#88f', '#113') +
            makeGradient('l', '#fc9', '#530') +
            makeGradient('lh', '#fea', '#742') +
            makeGradient('d', '#210', '#000') +
            makeGradient('w', '#55f', '#003') +
            map(gameState.p, function(player, index) {
                return makeGradient('p' + index, player.l, player.d) +
                    makeGradient('p' + index + 'h', player.h, player.hd);
            }).join(''));

    var ocean = makePolygon([[0,0],[mapWidth,0],[mapWidth,mapHeight],[0,mapHeight]], 'b', 'b');
    var tops = makeRegionPolys('r', 'l', 1, 1, 0, 0);
    var bottoms = makeRegionPolys('d', 'd', 1, 1, .05, .05);
    var shadows = makeRegionPolys('w', 'w', 1.05, 1.05, .2, .2, true);

    // replace the map container contents with the new map
    container.innerHTML = elem('svg', {
        viewbox: '0 0 100 100',
        preserveAspectRatio: 'none'
    }, defs + ocean + shadows + bottoms + tops);

    // clean some internal structures used to track HTML nodes
    soldierDivsById = {};

    // hook up region objects to their HTML elements
    map(regions, function(region, index) {
        region.e = $('r' + index);
        region.c = projectPoint(centerOfWeight(region.p));

        region.e.onclick = invokeUICallback.bind(0, region, 'c');
        region.e.onmouseover = invokeUICallback.bind(0, region, 'i');
        region.e.onmouseout = invokeUICallback.bind(0, region, 'o');

        region.e.oncontextmenu = debug.bind(0, region);
    });

    // additional callbacks for better UI
    doc.body.onclick = invokeUICallback.bind(0, null, 'c');

    // make the temple <div>s
    makeTemples();


    function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, noStroke) {
        return elem('g', {}, map(regions, function(region, index) {
            return makePolygon(transformPoints(region.p, xm, ym, xd, yd), idPrefix + index, gradient, noStroke);
        }).join(''));
    }

    function makeTemples() {
        forEachProperty(gameState.t, function(temple, index) {

            var center = temple.r.c,
                id = 'tp' + index,
                style = 'left:' + (center[0]-1.5) + '%;top:' + (center[1]-4) + '%';

            // create the temple <div>s
            var templeHTML = div({
                i: id,
                c: 'o',
                s: style
            }, div({c: 'i'}, div({c: 'i'}, div({c: 'i'}, div({c: 'i'})))));
            container.insertAdjacentHTML('beforeend', templeHTML);

            // retrieve elements and bind callbacks
            temple.e = $(''+id);
            temple.e.onclick = invokeUICallback.bind(0, temple.r, 't');
        });
    }
}

function prepareIngameUI(gameState) {
    // turn counter
    var html = div({i: 'tc', c: 'sc'});

    // player box area
    html += div({i: 'pd', c: 'sc un'}, map(gameState.p, function(player) {
        var pid = player.i;
        return div({
            i: 'pl' + pid,
            c: 'pli',
            style: 'background: ' + player.d
        }, player.n +
            div({c: 'ad', i: 'pr' + pid}) +
            div({c: 'ad', i: 'pc' + pid})
        );
    }).join(''));

    // info box
    html += div({c: 'sc', i: 'in'});

    // set it all
    $('d').innerHTML = html;
}

// ==========================================================
// This part of the code deals with responding to user actions
// ==========================================================

var uiCallbacks = {};

function invokeUICallback(object, type, event) {
	var cb = uiCallbacks[type];
	if (cb) {
		cb(object);
	}
    event.stopPropagation();
	return false;
}

function uiPickMove(player, state, reportMoveCallback) {
	var cleanState = {
		b: [
			{t: 'Cancel move', h:1},
			{t: 'End turn'}
		]
	};

	setCleanState();

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
        if (owner(state,region) == player) {
            state.d = {
                t: BUILD_ACTION,
                w: temple, r: region,
                b: makeUpgradeButtons(temple)
            };
        }
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

	function setCleanState() {
		state.d = deepCopy(cleanState, 3);
        state.d.h = state.r.filter(regionHasActiveArmy.bind(0, state, player));
		updateDisplay(state);
	}

    function makeUpgradeButtons(temple) {
        var upgradeButtons = map(UPGRADES, function(upgrade) {
            var templeOwner = owner(state, temple.r);
            // current upgrade level (either the level of the temple or number of soldiers bought already)
            var level = (temple.u == upgrade) ? (temple.l+1) : ((upgrade == SOLDIER) ? state.l[templeOwner.i] : 0);

            var cost = upgrade.c[level];
            var text = template(upgrade.n, LEVELS[level]) + elem('b', {}, " (" + cost + "&#9775;)");
            var description = template(upgrade.d, upgrade.x[level]);

            return {t: text, d: description, o: cost > cash(state, player), h: level >= upgrade.c.length};
        });
        upgradeButtons.push({t: "Cancel"});
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
        }
    });

    function updateRegionDisplay(region) {
        var regionOwner = owner(gameState, region);
        var gradientName = (regionOwner ? 'p' + regionOwner.i : 'l');
        var highlighted = contains(gameState.d && gameState.d.h || [], region);

        if (highlighted)
            gradientName += 'h';

        region.e.style.fill = 'url(#' + gradientName + ')';
        region.e.style.cursor = highlighted ? 'move' : 'default';
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

        // clickable?
        var templeOwner = owner(gameState, temple.r);
        temple.e.style.cursor = (templeOwner == activePlayer(gameState)) ? 'zoom-in' : 'default';

        // highlight?
        var selected = gameState.d && gameState.d.w == temple;
        temple.e.classList[selected ? 'add' : 'remove']('l');
    }
    function updateSoldierDisplay(region, soldier, index) {
        // we're still alive, so no removing our <div>
        soldiersStillAlive.push(soldier.i); // BUG: we're getting an 'undefined' in soldier here sometimes

        // find or create a <div> for showing the soldier
        var domElement = soldierDivsById[soldier.i];
        if (!domElement) {
            var html = div({c: 's'});
            var container = $('m');
            container.insertAdjacentHTML('beforeEnd', html);
            domElement = soldierDivsById[soldier.i] = container.lastChild;
            domElement.onclick = invokeUICallback.bind(0, soldier, 's');
        }

        // (re)calculate where the <div> should be
        var center = region.c;
        var totalSoldiers = soldierCount(gameState, region);
        var offset = (-0.6 * totalSoldiers + index * 1.2);
        domElement.style.left = (center[0]+offset-0.3) + '%';
        domElement.style.top  = (center[1]+1.5+offset*0.2) + '%';

        // selected?
        var decisionState = gameState.d || {};
        if ((decisionState.s == region) && (index < decisionState.c))
            domElement.classList.add('l');
        else
            domElement.classList.remove('l');
    }
}

function updateIngameUI(gameState) {
    var moveState = gameState.m;
    var decisionState = gameState.d;
    var buildingMode = decisionState && (decisionState.t == BUILD_ACTION);
    var active = activePlayer(gameState);

    // turn counter
    $('tc').innerHTML = 'Turn <b>' + gameState.m.t + '</b> / ' + turnCount;

    // player data
    map(gameState.p, function(player, index) {
        $('pl' + index).className = (index == moveState.p) ? 'pl' : 'pi'; // active or not?
        var regions = regionCount(gameState, player);
        if (regions) {
            $('pr' + index).innerHTML = regionCount(gameState, player) + '&#9733;'; // region count
            $('pc' + index).innerHTML = gameState.c[player.i] + '&#9775;'; // cash on hand
        } else {
            $('pr' + index).innerHTML = '&#9760;'; // skull and crossbones, you're dead
            $('pc' + index).innerHTML = '';
        }
    });

    // move info
    var info;
    if (buildingMode) {
        info = 'What shall we build?' + div({c: 'ds'}, 'Money left: ' + gameState.c[active.i] + '$');
    } else {
        info = 'Move phase' + div({c: 'ds'}, 'Moves left: ' + moveState.l);
    }
    $('in').innerHTML = info;

    // building mode
    $('pd').style.display = buildingMode ? 'none' : 'block';

    // buttons
    updateButtons(decisionState && decisionState.b);
}

function updateButtons(buttons) {
    $('u').innerHTML = '';
    map(buttons || [], function(button, index) {
        if (button.h) return;
        var id = 'b' + index;

        var buttonContents = button.t;
        if (button.d)
            buttonContents += div({c: 'ds'}, button.d);

        var buttonHTML = elem('a', {href: '#', i: id, c: button.o ? 'off' : ''}, buttonContents);
        $('u').insertAdjacentHTML('beforeend', buttonHTML);
        if (!button.o)
            $(id).onclick = invokeUICallback.bind(0, index, 'b');
    });
}

var displayedState;
function updateDisplay(gameState) {
    // just for debugging
    displayedState = gameState;

    updateMapDisplay(gameState);
    updateIngameUI(gameState);
}

function showBanner(background, text) {
    oneAtATime(1850, function() {
        var banner = $('bn'), styles = banner.style;

        styles.background = background;
        styles.display = 'block';
        styles.opacity = 1.0;
        banner.innerHTML = text;

        setTimeout(function() { styles.opacity = 0.0; }, 800);
        setTimeout(function() { styles.display = 'none'; }, 1800);
    });
}

function preserveAspect() {
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
}

// ==========================================================
// Preparing the initial game state happens here
// ==========================================================

function makeInitialState(setup) {
    var players = [];
    map(setup.p, function(playerController, playerIndex) {
        if (playerController == PLAYER_OFF) return;
        var player = deepCopy(PLAYER_TEMPLATES[playerIndex], 1);
        player.u = (playerController == PLAYER_HUMAN) ? uiPickMove : aiPickMove;
        player.i = players.length;
        players.push(player);
    });

	var regions = generateMap();
	var gameState = {
		p: players,
		r: regions,
		o: {}, t: {}, s: {}, c: {}, l: {},
		m: {t: 1, p: 0, m: MOVE_ARMY, l: movesPerTurn}
	};
	
	setupTemples();

	return gameState;


	function distance(region1, region2) {
		var c1 = centerOfWeight(region1.p), c2 = centerOfWeight(region2.p),
			dx = c1[0]-c2[0],
			dy = c1[1]-c2[1];
		return Math.sqrt(dx*dx+dy*dy);
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
		var templeRegions = max(possibleSetups, distanceScore);

		// we have the regions, set up each player
		map(players, function(player, index) {
			var region = templeRegions[index];
			// make one of the regions your own
			gameState.o[region.i] = player;
			// put a temple and 3 soldiers in it
			putTemple(region, 3);
		});

		// setup neutral temples
		map(gameState.p, function() {
			var bestRegion = max(gameState.r, function(region) {
				return distanceScore(templeRegions.concat(region));
			});
			putTemple(bestRegion, 3);
			templeRegions.push(bestRegion);
		});
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
    // the AI only analyzes its own moves (threats are handled in heuristic)
    var depth = state.m.l;

    // use a min-max search to find the best move looking a few steps forward
    performMinMax(player, state, depth, reportMoveCallback);
}

function minMaxDoSomeWork(node) {
    if (node.d == 0) {
        // terminal node, evaluate and return
        node.v = heuristicPositionValueForPlayer(node.a, node.s);
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
        var better = (!node.b) || (maximizingNode && (child.v > node.v)) || ((!maximizingNode) && (child.v < node));
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
    var unitOfWork = 100, minimumTime = 1000;
    var timeStart = now();

    setTimeout(doSomeWork, 1);

    function doSomeWork() {
        var stepsRemaining = unitOfWork;
        while (stepsRemaining--) {
            currentNode = minMaxDoSomeWork(currentNode);
            if (!currentNode) {
                // we're done, let's see what's the best move we found!
                // perform the move (after a timeout if the minimal 'thinking time' wasn't reached
                var elapsedTime = now() - timeStart;
                setTimeout(moveCallback.bind(0,initialNode.b), max([minimumTime - elapsedTime, 1]));
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
                   addArmyMove(region, neighbour, Math.floor(soldiers / 2));
           });
       }
    });

    // return the list, shuffled (so there is no bias due to move generation order)
    shuffle(moves);
    return moves;
}

function heuristicPositionValueForPlayer(player, state) {
    return heuristicForSinglePlayer(player, state);
}

function slidingBonus(state, startOfGameValue, endOfGameValue, dropOffTurn) {
    var alpha = (state.m.t - dropOffTurn) / (turnCount - dropOffTurn);
    if (alpha < 0.0)
        alpha = 0.0;
    return (startOfGameValue + (endOfGameValue - startOfGameValue) * alpha);
}

function heuristicForSinglePlayer(player, state, debug) {
    var templeBonus = slidingBonus(state, 8, 0, 1),
        soldierBonus = slidingBonus(state, 0.33, 0, 10);

    function regionFullValue(region) {
        return 1 +
            (state.t[region.i] ? templeBonus : 0);
    }

    function regionThreat(region) {
        var ourPresence = soldierCount(state, region);
        var enemyPresence = sum(region.n, function(neighbour) {
            var nOwner = owner(state, neighbour);
            return (nOwner && (nOwner != player)) ? soldierCount(state, neighbour) : 0;
        });
        return clamp((enemyPresence / (ourPresence+0.0001) - 1) * 0.5, 0, 0.75);
    }

    function regionOpportunity(region) {
        // how much conquest does this region enable?
        var attackingSoldiers = soldierCount(state, region);
        if (!attackingSoldiers)
            return 0;

        return sum(region.n, function(neighbour) {
            if (owner(state, neighbour) != player) {
                var defendingSoldiers = soldierCount(state, neighbour);
                return clamp((attackingSoldiers / (defendingSoldiers + 0.01) - 0.9) * regionFullValue(neighbour) * 0.5, 0, 0.5);
            } else {
                return 0;
            }
        });
    }

    function adjustedRegionValue(region) {
        // count the value of the region itself
        var value = regionFullValue(region);
        // but reduce it by the threat other players pose to it (or increase by our threat to them)
        return (1.0 - regionThreat(region)) * value +
            regionOpportunity(region) +
            soldierCount(state, region) * soldierBonus
    }

    if (debug) {
        console.log("Opportunity value:", regionOpportunity(debug));
        console.log("Adjusted RV: ", adjustedRegionValue(debug));
    }

    return sum(state.r, function (region) {
        return (owner(state, region) == player) ? adjustedRegionValue(region) : 0;
    });
}

function debug(region) {
    console.log("INCOME:", income(displayedState, owner(displayedState, region)));
    return false;
}

// ==========================================================
// All the game logic and the machinery that runs its main
// loop reside below.
// ==========================================================

function pickMove(player, state, reportMoveCallback) {
    // dead players just skip their turns, cause they're DEAD
    if (!regionCount(state,player))
        return reportMoveCallback({t: END_TURN});

	// delegate to whoever handles this player
    player.u(player, state, reportMoveCallback);
}

function makeMove(state, move) {
	state = copyState(state);
	
	var moveType = move.t;
	if (moveType == MOVE_ARMY) {
        moveSoldiers(state, move.s, move.d, move.c);
    } else if (moveType == BUILD_ACTION) {
        buildUpgrade(state, move.r, move.u);
	} else if (moveType == END_TURN) {
		state.m.l = 0;
	}

    // updates that happen after each move (checking for players losing, etc.)
    afterMoveChecks(state);

	return state;
}

/**
 * Creates an independent copy of the game state, prior to modifying it.
 **/
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
        l: deepCopy(state.l, 1)
		// and some others are completely omitted - namely 'd', the current 'move decision' partial state
	};
}

function playOneMove(state) {
    // oneAtATime is used to ensure that all animations from previous moves complete before a new one is played
    oneAtATime(150, function() {
        var controllingPlayer = activePlayer(state); // who is the active player to make some kind of move?

        // let the player pick their move using UI or AI
        pickMove(controllingPlayer, state, function(move) {
            // the move is chosen - update state to a new immutable copy
            var newState = makeMove(state, move);
            // did the game end?
            if (newState.e) {
                // yes, the game has ended
                oneAtATime(150, updateDisplay.bind(0, newState));
                showEndGame(newState);
                return;
            } else {
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
                showBanner('#222', player.n + " has been eliminated!");
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

    // moving to next turn
    if (!state.m.l)
        nextTurn(state);
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

function moveSoldiers(state, fromRegion, toRegion, howMany) {
	var fromList = state.s[fromRegion.i];
	var toList = state.s[toRegion.i] || (state.s[toRegion.i] = []);
	var fromOwner = owner(state, fromRegion);
	var toOwner = owner(state, toRegion);

	// do we have a fight?
	if (fromOwner != toOwner) {
		// first, the attackers kill some defenders
		var incomingStrength = howMany * (1 + upgradeLevel(state, fromOwner, FIRE) * 0.01);
		var defendingStrength = toList.length * (1 + upgradeLevel(state, toOwner, EARTH) * 0.01);

		if (defendingStrength) {
			var repeats = min([incomingStrength, defendingStrength]);
			var attackerWinChance = 100 * Math.pow(incomingStrength / defendingStrength, 1.6);
			var attackerDamage = 0;

			map(range(0,repeats), function(index) {
				if (randomNumberForFight(index) <= 120)
					attackerDamage++;
			});

            function randomNumberForFight(index) {
                var maximum = 120 + attackerWinChance;
                if (state.a) {
                    // simulated fight - return some numbers
                    // they're clustered about the center of the range to
                    // make the AI more "decisive" (this exaggerates any advantages)
                    return (index + 3) * maximum / (repeats + 5);
                } else {
                    // not a simulated fight - return a real random number
                    return rint(0, maximum);
                }
            }

            var defenderDamage = repeats - attackerDamage;
			map(range(0,attackerDamage), function() { fromList.shift() });
			map(range(0,defenderDamage), function() { toList.shift() });

            // money for the martyrs
            if (toOwner)
                state.c[toOwner.i] += defenderDamage * 4;

            // if there are defenders left, nobody will move in
            if (toList.length)
                howMany = 0;
		}
	}

	if (howMany > 0) {
		// move the (remaining) soldiers
		map(range(0, howMany), function() {
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
        }
    }

	// use up the move
    state.m.l--;
}
function buildUpgrade(state, region, upgrade) {
    var temple = state.t[region.i];
    var templeOwner = owner(state, region);
    if (upgrade == SOLDIER) {
        // soldiers work diferently
        var soldierLevel = state.l[templeOwner.i]++;
        state.c[templeOwner.i] -= upgrade.c[soldierLevel];
        return addSoldiers(state, region, 1);
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
}

function nextTurn(state) {
	var player = activePlayer(state);
	
	// cash is produced
	state.c[player.i] += income(state, player);

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
    if (state.m.t > turnCount) {
        // end the game!
        state.m.t = turnCount;
        state.e = determineGameWinner(state);
        return;
    }

    // if this is not simulated, we'd like a banner
    if (!state.a) {
        // update view and show next turn banner
        oneAtATime(1000, updateDisplay.bind(0, state));
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

        $('tc').innerHTML = "Game complete";
        $('in').innerHTML = div({c: 'ds'}, "Click the button bellow to start a new game.");
        map(state.p, function(_, index) {
            $('pl' + index).className = 'pl';
        });
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
    // 1 faith per region
    var fromRegions = regionCount(state, player);
    // 3 faith per each soldier at temple (too much?)
    var fromTemples = sum(temples(state,player), function(temple) {
        return soldierCount(state, temple.r) * 3;
    });
    var multiplier = 1.0 + 0.01 * upgradeLevel(state, player, WATER);
    return Math.ceil(multiplier * (fromRegions + fromTemples));
}

function regionHasActiveArmy(state, player, region) {
    return (owner(state, region) == player) && soldierCount(state, region) && (!contains(state.m.z, region));
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

// ==========================================================
// This is the code for the game setup screen.
// ==========================================================

var PLAYER_TEMPLATES = [
    {i:0, n: 'Amber', l: '#ffa', d:'#960', h: '#fff', hd:'#a80'},
    {i:1, n: 'Crimson', l: '#f88', d:'#722', h: '#faa', hd:'#944'},
    {i:2, n: 'Lavender', l: '#d9d', d:'#537', h: '#faf', hd:'#759'},
    {i:3, n: 'Emerald', l: '#9d9', d:'#262', h: '#bfb', hd:'#484'}
];

function prepareSetupUI() {
    // player box area
    var html = div({c: 'sc ds'}, "Player setup");
    var playerBoxes = map(PLAYER_TEMPLATES, function(player) {
        var pid = player.i;
        return div({
                i: 'pl' + pid,
                c: 'pl ps',
                style: 'background: ' + player.d
            }, player.n + playerButtons(pid)
        );
    }).join("");
    html += div({i: 'pd', c: 'sc un'}, playerBoxes);

    // realize the UI
    $('d').innerHTML = html;

    // setup callbacks for players
    for2d(0, 0, PLAYER_TEMPLATES.length, 3, function(playerIndex, buttonIndex) {
        $('sb' + playerIndex + buttonIndex).onclick = invokeUICallback.bind(0, {p: playerIndex, b: buttonIndex}, 'sb')
    });

    function playerButtons(playerIndex) {
        return map(["CPU", "Human", "Off"], function(label, buttonIndex) {
          var id = "sb" + playerIndex + buttonIndex;
          return elem('a', {i: id, c: 'rt', href: '#'}, label);
        }).join("");
    }
}

var gameSetup = {
    p: [PLAYER_HUMAN, PLAYER_HUMAN, PLAYER_OFF, PLAYER_OFF]
};
function runSetupScreen() {
    // generate initial setup and game state
    var game;
    regenerateMap();

    // prepare UI
    prepareSetupUI();
    updateBottomButtons();
    updatePlayerButtons();

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
        updatePlayerButtons();
        updateBottomButtons();
        regenerateMap();
    };

    function setupValid() {
        var enabledPlayers = sum(gameSetup.p, function(playerState) {
            return (playerState != PLAYER_OFF) ? 1 : 0;
        });
        console.log(enabledPlayers);
        return enabledPlayers > 1;
    }

    function updateBottomButtons() {
        var buttonsDisabled = !setupValid();
        updateButtons([
            {t: "Change map", o: buttonsDisabled},
            {t: "Start game", o: buttonsDisabled}
        ]);
    }

    function updatePlayerButtons() {
        map(gameSetup.p, function(controller, playerIndex) {
           map(range(0,3), function(buttonIndex) {
               $('sb' + playerIndex + buttonIndex).classList[(controller == buttonIndex) ? 'add' : 'remove']('sl');
           })
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
// This part of the code initalizes a new game.
// ==========================================================

// keep the aspect of the gameplay area correct
(wnd.onresize = preserveAspect)();

// start the game
!function() {
    runSetupScreen();
}();