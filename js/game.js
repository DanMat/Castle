/*
 * Castle — a top-down maze chase & rescue.
 *
 * Rebuilt from the original Akihabara-engine version into a dependency-free
 * canvas game: you're lost in a castle, mummies (and bats and guards) chase
 * you, and you must grab the key, rescue your friend, and escort them to the
 * exit before the timer runs out — across 8 escalating, generated mazes with
 * torchlight fog, spike traps, power-ups and an online leaderboard. All art is
 * drawn procedurally (no image assets).
 */
(function () {
	'use strict';

	var TILE = 40, W = 880, H = 560;
	var LEVELS = window.CASTLE_LEVELS;
	var canvas, ctx, dpr = 1, raf, lastTime;
	var el = {};

	/* ------------------------------- state -------------------------------- */

	// Initialised up front so render() is safe before a game starts.
	var state = 'title';
	var grid = [[0]], gridW = 1, gridH = 1;
	var player = null, friend = null, enemies = [], items = [], spikes = [], trail = [];
	var cam = { x: 0, y: 0 };
	var levelIndex = 0, lvl = null;
	var score = 0, lives = 3, combo = 1, comboTimer = 0, keysHave = 0, keysNeed = 0, rescued = false, noHit = true;
	var timeLeft = 60, torchR = 999, torchBoost = 0, freeze = 0, sprint = 0, flash = 0, shake = 0;
	var msg = '', msgT = 0, introTimer = 0, elapsed = 0;
	var input = { up: false, down: false, left: false, right: false, touch: null };

	var THEMES = {
		stone:  { floor: '#2b2f3a', floor2: '#242833', wall: '#4a5266', wallTop: '#5b6580', accent: '#ffcf6b' },
		cellar: { floor: '#2e2620', floor2: '#271f1a', wall: '#5a4636', wallTop: '#6e5642', accent: '#ffb14a' },
		hall:   { floor: '#2a2436', floor2: '#231e2e', wall: '#4a3f66', wallTop: '#5c4f80', accent: '#c58bff' },
		crypt:  { floor: '#1c241f', floor2: '#161d19', wall: '#33453a', wallTop: '#42574a', accent: '#7dffab' }
	};

	/* ------------------------------ helpers ------------------------------- */

	function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
	function rand(a, b) { return a + Math.random() * (b - a); }
	function tileOf(o) { return { tx: Math.floor(o.x / TILE), ty: Math.floor(o.y / TILE) }; }
	function centerOf(tx, ty) { return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }; }
	function isWall(tx, ty) { return tx < 0 || ty < 0 || tx >= gridW || ty >= gridH || grid[ty][tx] === 1; }
	function boxHitsWall(x, y, h) {
		return isWall(Math.floor((x - h) / TILE), Math.floor((y - h) / TILE)) ||
			isWall(Math.floor((x + h) / TILE), Math.floor((y - h) / TILE)) ||
			isWall(Math.floor((x - h) / TILE), Math.floor((y + h) / TILE)) ||
			isWall(Math.floor((x + h) / TILE), Math.floor((y + h) / TILE));
	}

	/* --------------------------- maze generation -------------------------- */

	function generateMaze(cols, rows) {
		gridW = cols * 2 + 1; gridH = rows * 2 + 1;
		grid = [];
		for (var y = 0; y < gridH; y++) { grid[y] = []; for (var x = 0; x < gridW; x++) { grid[y][x] = 1; } }
		var visited = [];
		for (y = 0; y < rows; y++) { visited[y] = []; for (x = 0; x < cols; x++) { visited[y][x] = false; } }
		var stack = [[0, 0]]; visited[0][0] = true; grid[1][1] = 0;
		while (stack.length) {
			var c = stack[stack.length - 1], cx = c[0], cy = c[1];
			var nb = [];
			[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
				var nx = cx + d[0], ny = cy + d[1];
				if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited[ny][nx]) { nb.push([nx, ny, d]); }
			});
			if (!nb.length) { stack.pop(); continue; }
			var pick = nb[(Math.random() * nb.length) | 0];
			visited[pick[1]][pick[0]] = true;
			grid[cy * 2 + 1 + pick[2][1]][cx * 2 + 1 + pick[2][0]] = 0; // knock down the wall between
			grid[pick[1] * 2 + 1][pick[0] * 2 + 1] = 0;
			stack.push([pick[0], pick[1]]);
		}
		// Braid a few dead-ends into loops so it's less linear.
		for (var i = 0; i < cols * rows * 0.12; i++) {
			var rx = 1 + 2 * ((Math.random() * cols) | 0), ry = 1 + 2 * ((Math.random() * rows) | 0);
			var dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0];
			var wx = rx + dir[0], wy = ry + dir[1];
			if (wx > 0 && wy > 0 && wx < gridW - 1 && wy < gridH - 1) { grid[wy][wx] = 0; }
		}
	}

	function floorTiles() {
		var f = [];
		for (var y = 0; y < gridH; y++) { for (var x = 0; x < gridW; x++) { if (grid[y][x] === 0) { f.push({ tx: x, ty: y }); } } }
		return f;
	}

	// BFS distances from a tile (for placement).
	function distances(sx, sy) {
		var d = []; for (var y = 0; y < gridH; y++) { d[y] = []; for (var x = 0; x < gridW; x++) { d[y][x] = -1; } }
		var q = [[sx, sy]]; d[sy][sx] = 0;
		while (q.length) {
			var c = q.shift();
			[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dir) {
				var nx = c[0] + dir[0], ny = c[1] + dir[1];
				if (nx >= 0 && ny >= 0 && nx < gridW && ny < gridH && grid[ny][nx] === 0 && d[ny][nx] < 0) { d[ny][nx] = d[c[1]][c[0]] + 1; q.push([nx, ny]); }
			});
		}
		return d;
	}

	function bfsPath(a, b) {
		if (a.tx === b.tx && a.ty === b.ty) { return []; }
		var q = [[a.tx, a.ty]], seen = {}, prev = {}; seen[a.tx + ',' + a.ty] = 1;
		while (q.length) {
			var c = q.shift();
			if (c[0] === b.tx && c[1] === b.ty) {
				var path = [], cur = c;
				while (!(cur[0] === a.tx && cur[1] === a.ty)) { path.unshift({ tx: cur[0], ty: cur[1] }); cur = prev[cur[0] + ',' + cur[1]]; }
				return path;
			}
			var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
			for (var k = 0; k < 4; k++) {
				var nx = c[0] + dirs[k][0], ny = c[1] + dirs[k][1], key = nx + ',' + ny;
				if (nx >= 0 && ny >= 0 && nx < gridW && ny < gridH && grid[ny][nx] === 0 && !seen[key]) { seen[key] = 1; prev[key] = c; q.push([nx, ny]); }
			}
		}
		return [];
	}

	/* ------------------------------ new game ------------------------------ */

	function newGame() { score = 0; lives = 3; levelIndex = 0; startLevel(0); }

	function startLevel(idx) {
		levelIndex = idx; lvl = LEVELS[idx];
		generateMaze(lvl.cols, lvl.rows);
		var tiles = floorTiles();
		var start = tiles[0];                         // top-left-ish floor cell = the exit gate
		var dist = distances(start.tx, start.ty);
		// Friend = farthest reachable floor cell.
		var far = start, best = -1;
		tiles.forEach(function (t) { if (dist[t.ty][t.tx] > best) { best = dist[t.ty][t.tx]; far = t; } });

		player = { x: 0, y: 0, r: 13, speed: 3.4, facing: 'down', dead: false, anim: 0, sx: start.tx, sy: start.ty };
		var sc = centerOf(start.tx, start.ty); player.x = sc.x; player.y = sc.y;
		friend = { x: sc.x, y: sc.y, r: 12, facing: 'down', anim: 0, tx: far.tx, ty: far.ty };
		var fc = centerOf(far.tx, far.ty); friend.x = fc.x; friend.y = fc.y;

		enemies = []; items = []; spikes = []; trail = [];
		rescued = false; noHit = true; combo = 1; comboTimer = 0;
		keysHave = 0; keysNeed = lvl.keys;
		timeLeft = lvl.time; torchR = lvl.torch; torchBoost = 0; freeze = 0; sprint = 0;
		cam.x = 0; cam.y = 0;

		// Reserve tiles (avoid start & friend & their neighbourhood).
		var used = {}; used[start.tx + ',' + start.ty] = 1; used[far.tx + ',' + far.ty] = 1;
		function take(minDistFromStart) {
			for (var tries = 0; tries < 200; tries++) {
				var t = tiles[(Math.random() * tiles.length) | 0];
				if (used[t.tx + ',' + t.ty]) { continue; }
				if (dist[t.ty][t.tx] < minDistFromStart) { continue; }
				used[t.tx + ',' + t.ty] = 1; return t;
			}
			return null;
		}

		function addItem(type, t) { if (t) { items.push({ tx: t.tx, ty: t.ty, type: type, taken: false, bob: rand(0, 6.28) }); } }
		for (var i = 0; i < lvl.keys; i++) { addItem('key', take(best * 0.4)); }
		for (i = 0; i < lvl.treasure; i++) { addItem('gem', take(2)); }
		for (i = 0; i < lvl.hourglass; i++) { addItem('time', take(4)); }
		var pkinds = ['freeze', 'sprint', 'torch'];
		for (i = 0; i < lvl.powerups; i++) { addItem(pkinds[i % 3], take(3)); }
		for (i = 0; i < lvl.spikes; i++) { var t = take(4); if (t) { spikes.push({ tx: t.tx, ty: t.ty, phase: rand(0, 2) }); } }

		var espawns = [];
		function spawn(type, speed, count) {
			for (var n = 0; n < count; n++) {
				var t = take(8); if (!t) { t = take(4); } if (!t) { continue; }
				var cc = centerOf(t.tx, t.ty);
				espawns.push({ x: cc.x, y: cc.y, r: 13, type: type, speed: speed, facing: 'down', path: [], repath: 0, anim: rand(0, 6.28), sx: t.tx, sy: t.ty });
			}
		}
		spawn('mummy', 2.1, lvl.mummies);
		spawn('bat', 3.2, lvl.bats);
		spawn('guard', 2.4, lvl.guards);
		espawns.forEach(function (e) { if (e.type === 'guard') { e.dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0]; } });
		enemies = espawns;

		showIntro();
	}

	function respawn() {
		var sc = centerOf(player.sx, player.sy);
		player.x = sc.x; player.y = sc.y; player.dead = false;
		enemies.forEach(function (e) { var c = centerOf(e.sx, e.sy); e.x = c.x; e.y = c.y; e.path = []; });
		if (rescued) { friend.x = sc.x; friend.y = sc.y; }
		trail = []; freeze = 1.2; noHit = false;
	}

	function startGame() { newGame(); }

	/* ------------------------------- flow --------------------------------- */

	function showIntro() {
		state = 'intro'; introTimer = 1.9;
		el.introLevel.textContent = 'Level ' + (levelIndex + 1) + ' / ' + LEVELS.length;
		el.introName.textContent = lvl.name; el.introTag.textContent = lvl.tag;
		showScreen('screenIntro'); updateHud();
	}
	function beginPlay() { state = 'playing'; showScreen(null); lastTime = performance.now(); }

	function loseLife() {
		lives--; flash = 1; shake = 14; updateHud();
		if (lives <= 0) { return endGame(false); }
		toast('Caught! ' + lives + ' lives left');
		respawn();
	}

	function levelClear() {
		var bonus = 500 + Math.ceil(timeLeft) * 20 + (noHit ? 1000 : 0);
		score += bonus; toast('Escaped! +' + bonus);
		if (levelIndex >= LEVELS.length - 1) { return endGame(true); }
		startLevel(levelIndex + 1);
	}

	function endGame(won) {
		state = 'ending';
		if (won) { score += lives * 1000; }
		Leaderboard.qualifies(score).then(function (ok) { ok ? showInitials() : showGameover(won); });
	}
	function showGameover(won) {
		state = 'gameover';
		el.goTitle.textContent = won ? 'You escaped the castle!' : 'Game Over';
		el.goScore.textContent = score.toLocaleString();
		el.goSub.textContent = won ? 'All ' + LEVELS.length + ' levels cleared.' : 'Reached level ' + (levelIndex + 1) + '.';
		showScreen('screenGameover');
	}

	/* -------------------------------- loop -------------------------------- */

	function loop(now) {
		var dt = Math.min((now - lastTime) / 1000, 0.05);
		lastTime = now;
		if (state === 'playing') { update(dt); }
		else if (state === 'intro') { introTimer -= dt; if (introTimer <= 0) { beginPlay(); } }
		render();
		raf = requestAnimationFrame(loop);
	}

	function update(dt) {
		elapsed += dt;
		timeLeft -= dt;
		if (timeLeft <= 0) { timeLeft = 0; return timeOut(); }
		if (freeze > 0) { freeze -= dt; }
		if (sprint > 0) { sprint -= dt; }
		if (torchBoost > 0) { torchBoost -= dt; }
		if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) { combo = 1; } }
		if (flash > 0) { flash = Math.max(0, flash - dt * 2); }
		if (shake > 0) { shake = Math.max(0, shake - dt * 60); }
		if (msgT > 0) { msgT -= dt; }

		updatePlayer(dt);
		updateFriend(dt);
		updateEnemies(dt);
		updateItems();
		updateSpikes();
		updateCamera();
		updateHud();
	}

	function timeOut() { toast("Time's up!"); loseLife(); }

	/* ------------------------------ player -------------------------------- */

	function updatePlayer(dt) {
		var p = player, f = dt * 60, sp = p.speed * (sprint > 0 ? 1.6 : 1);
		var mx = 0, my = 0;
		if (input.touch) { mx = input.touch.dx; my = input.touch.dy; }
		else { mx = (input.right ? 1 : 0) - (input.left ? 1 : 0); my = (input.down ? 1 : 0) - (input.up ? 1 : 0); }
		var m = Math.hypot(mx, my);
		if (m > 0) {
			mx /= m; my /= m;
			var nx = p.x + mx * sp * f;
			if (!boxHitsWall(nx, p.y, p.r)) { p.x = nx; }
			var ny = p.y + my * sp * f;
			if (!boxHitsWall(p.x, ny, p.r)) { p.y = ny; }
			p.facing = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up');
			p.anim += dt * 10;
		}
		// breadcrumb trail for the rescued friend to follow
		trail.push({ x: p.x, y: p.y });
		if (trail.length > 90) { trail.shift(); }

		// reach the exit with the friend and all keys → clear
		var pt = tileOf(p);
		if (pt.tx === p.sx && pt.ty === p.sy && rescued && keysHave >= keysNeed) { levelClear(); }
	}

	/* ------------------------------ friend -------------------------------- */

	function updateFriend(dt) {
		if (!rescued) {
			if (Math.hypot(player.x - friend.x, player.y - friend.y) < player.r + friend.r + 2) {
				rescued = true; toast('Friend rescued! Get to the exit');
			}
			return;
		}
		// follow the player's breadcrumb trail from a short distance behind
		var target = trail[Math.max(0, trail.length - 42)];
		if (target) {
			var dx = target.x - friend.x, dy = target.y - friend.y, d = Math.hypot(dx, dy);
			if (d > 4) { var s = Math.min(player.speed * (dt * 60), d); friend.x += dx / d * s; friend.y += dy / d * s; friend.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); friend.anim += dt * 8; }
		}
	}

	/* ------------------------------ enemies ------------------------------- */

	function updateEnemies(dt) {
		if (freeze > 0) { return; }
		var f = dt * 60, pt = tileOf(player);
		enemies.forEach(function (e) {
			e.anim += dt * 6;
			if (e.type === 'guard') { patrol(e, f); }
			else {
				e.repath -= dt;
				if (e.repath <= 0 || !e.path.length) { e.path = bfsPath(tileOf(e), pt); e.repath = e.type === 'bat' ? 0.25 : 0.45; }
				followPath(e, f);
			}
			if (!player.dead && Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r - 6) { hit(); }
		});
	}

	function followPath(e, f) {
		if (!e.path.length) { return; }
		var t = e.path[0], c = centerOf(t.tx, t.ty), dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy);
		if (d < 3) { e.x = c.x; e.y = c.y; e.path.shift(); return; }
		e.x += dx / d * e.speed * f; e.y += dy / d * e.speed * f;
		e.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
	}

	function patrol(e, f) {
		if (!e.dir) { e.dir = [1, 0]; }
		var nx = e.x + e.dir[0] * e.speed * f, ny = e.y + e.dir[1] * e.speed * f;
		if (boxHitsWall(nx, ny, e.r) || Math.random() < 0.02) {
			var opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) { return !boxHitsWall(e.x + d[0] * (e.r + 4), e.y + d[1] * (e.r + 4), e.r); });
			if (opts.length) { e.dir = opts[(Math.random() * opts.length) | 0]; }
		} else { e.x = nx; e.y = ny; }
		e.facing = Math.abs(e.dir[0]) > Math.abs(e.dir[1]) ? (e.dir[0] > 0 ? 'right' : 'left') : (e.dir[1] > 0 ? 'down' : 'up');
	}

	function hit() {
		if (freeze > 0 || player.dead) { return; }
		player.dead = true; loseLife();
	}

	/* ------------------------------- items -------------------------------- */

	function updateItems() {
		var pt = tileOf(player);
		items.forEach(function (it) {
			if (it.taken || it.tx !== pt.tx || it.ty !== pt.ty) { return; }
			it.taken = true;
			if (it.type === 'gem') { combo = comboTimer > 0 ? Math.min(combo + 1, 9) : 2; comboTimer = 3; score += 100 * combo; toast(combo > 2 ? '+' + (100 * combo) + '  x' + combo : '+' + (100 * combo)); }
			else if (it.type === 'key') { keysHave++; toast('Got the key!'); }
			else if (it.type === 'time') { timeLeft += 15; toast('+15 seconds'); }
			else if (it.type === 'freeze') { freeze = 5; toast('Freeze! Mummies stopped'); }
			else if (it.type === 'sprint') { sprint = 6; toast('Sprint!'); }
			else if (it.type === 'torch') { torchBoost = 8; toast('Torch!'); }
			updateHud();
		});
	}

	function updateSpikes() {
		var pt = tileOf(player);
		spikes.forEach(function (s) {
			if (spikeActive(s) && s.tx === pt.tx && s.ty === pt.ty && !player.dead) { hit(); }
		});
	}
	function spikeActive(s) { return (Math.sin((elapsed + s.phase) * 2.2) > 0.3); }

	function updateCamera() {
		var mazeW = gridW * TILE, mazeH = gridH * TILE;
		cam.x = mazeW <= W ? (mazeW - W) / 2 : clamp(player.x - W / 2, 0, mazeW - W);
		cam.y = mazeH <= H ? (mazeH - H) / 2 : clamp(player.y - H / 2, 0, mazeH - H);
	}

	/* -------------------------------- render ------------------------------ */

	function render() {
		// Nothing to draw until a level is loaded (player exists) — the title and
		// other menus are DOM overlays over the canvas background.
		if (!lvl || !player) { ctx.clearRect(0, 0, W, H); return; }
		ctx.save();
		if (shake > 0) { ctx.translate(rand(-shake, shake) * 0.4, rand(-shake, shake) * 0.4); }
		ctx.translate(-cam.x, -cam.y);
		drawMaze();
		drawItems();
		drawSpikes();
		drawExit();
		if (friend) { drawFriend(); }
		drawEnemies();
		drawPlayer();
		ctx.restore();
		if (torchR < 999 || torchBoost > 0) { drawFog(); }
		if (flash > 0) { ctx.fillStyle = 'rgba(255,40,60,' + (flash * 0.35) + ')'; ctx.fillRect(0, 0, W, H); }
		drawMinimap();
		if (msgT > 0 && state === 'playing') { drawMsg(); }
	}

	function theme() { return THEMES[lvl ? lvl.theme : 'stone']; }

	function drawMaze() {
		var t = theme();
		var x0 = Math.floor(cam.x / TILE), y0 = Math.floor(cam.y / TILE);
		var x1 = Math.ceil((cam.x + W) / TILE), y1 = Math.ceil((cam.y + H) / TILE);
		for (var y = y0; y <= y1; y++) {
			for (var x = x0; x <= x1; x++) {
				if (x < 0 || y < 0 || x >= gridW || y >= gridH) { continue; }
				var px = x * TILE, py = y * TILE;
				if (grid[y][x] === 1) {
					ctx.fillStyle = t.wall; ctx.fillRect(px, py, TILE, TILE);
					ctx.fillStyle = t.wallTop; ctx.fillRect(px, py, TILE, 6);
					ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, TILE - 1, TILE - 1);
				} else {
					ctx.fillStyle = (x + y) % 2 ? t.floor : t.floor2; ctx.fillRect(px, py, TILE, TILE);
				}
			}
		}
	}

	function drawExit() {
		var c = centerOf(player.sx, player.sy), t = theme(), open = rescued && keysHave >= keysNeed;
		ctx.save(); ctx.translate(c.x, c.y);
		ctx.fillStyle = open ? t.accent : '#3a2a1a'; ctx.shadowColor = open ? t.accent : 'transparent'; ctx.shadowBlur = open ? 18 : 0;
		roundRect(-15, -18, 30, 36, 4); ctx.fill();
		ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,.4)';
		if (!open) { for (var i = -1; i <= 1; i++) { ctx.fillRect(i * 8 - 1, -16, 3, 32); } } // bars
		else { ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(-9, -12, 18, 24, 3); ctx.fill(); }
		ctx.restore();
	}

	function drawItems() {
		items.forEach(function (it) {
			if (it.taken) { return; }
			var c = centerOf(it.tx, it.ty), bob = Math.sin(elapsed * 3 + it.bob) * 3;
			ctx.save(); ctx.translate(c.x, c.y + bob);
			if (it.type === 'gem') { ctx.fillStyle = '#5ad1ff'; ctx.shadowColor = '#5ad1ff'; ctx.shadowBlur = 8; ctx.rotate(0.785); ctx.fillRect(-6, -6, 12, 12); }
			else if (it.type === 'key') { ctx.fillStyle = '#ffd24a'; ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(-4, 0, 6, 0, 6.28); ctx.fill(); ctx.fillRect(0, -2, 12, 4); ctx.fillRect(8, -2, 3, 7); }
			else if (it.type === 'time') { ctx.fillStyle = '#ffe066'; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(7, -8); ctx.lineTo(0, 0); ctx.closePath(); ctx.moveTo(-7, 8); ctx.lineTo(7, 8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); }
			else { var col = it.type === 'freeze' ? '#8fd6ff' : it.type === 'sprint' ? '#7dffab' : '#ff9f43'; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12; roundRect(-9, -9, 18, 18, 5); ctx.fill(); ctx.fillStyle = '#05131a'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.type[0].toUpperCase(), 0, 1); }
			ctx.restore();
		});
	}

	function drawSpikes() {
		spikes.forEach(function (s) {
			var c = centerOf(s.tx, s.ty), on = spikeActive(s);
			ctx.fillStyle = on ? '#d0d6de' : 'rgba(120,130,140,.35)';
			var h = on ? 14 : 5;
			for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(c.x + i * 11 - 5, c.y + 12); ctx.lineTo(c.x + i * 11, c.y + 12 - h); ctx.lineTo(c.x + i * 11 + 5, c.y + 12); ctx.closePath(); ctx.fill(); }
		});
	}

	function drawPlayer() {
		var p = player; drawHero(p.x, p.y, '#4aa0ff', '#eaf4ff', p.facing, p.anim, p.dead);
	}
	function drawFriend() {
		if (!rescued && (torchR < 999 || torchBoost > 0)) { /* hidden by fog until found — still drawn, fog covers it */ }
		drawHero(friend.x, friend.y, '#ff79c6', '#fff0fb', friend.facing, friend.anim, false);
	}
	function drawHero(x, y, body, face, facing, anim, dead) {
		ctx.save(); ctx.translate(x, y);
		if (dead) { ctx.globalAlpha = 0.5; }
		var bobY = Math.sin(anim) * 1.5;
		ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 13, 11, 4, 0, 0, 6.28); ctx.fill();
		ctx.fillStyle = body; roundRect(-11, -14 + bobY, 22, 26, 8); ctx.fill();
		ctx.fillStyle = face; ctx.beginPath(); ctx.arc(0, -9 + bobY, 7, 0, 6.28); ctx.fill();
		ctx.fillStyle = '#1a1a22';
		var ex = facing === 'left' ? -3 : facing === 'right' ? 3 : 0;
		ctx.beginPath(); ctx.arc(-3 + ex, -9 + bobY, 1.6, 0, 6.28); ctx.arc(3 + ex, -9 + bobY, 1.6, 0, 6.28); ctx.fill();
		ctx.restore();
	}

	function drawEnemies() {
		enemies.forEach(function (e) {
			ctx.save(); ctx.translate(e.x, e.y);
			var bob = Math.sin(e.anim) * 2;
			ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 13, 11, 4, 0, 0, 6.28); ctx.fill();
			if (e.type === 'bat') {
				ctx.fillStyle = '#6a4a8a'; ctx.beginPath();
				ctx.moveTo(0, 0); ctx.lineTo(-16, -6 + bob); ctx.lineTo(-6, 2); ctx.lineTo(0, 0); ctx.lineTo(6, 2); ctx.lineTo(16, -6 + bob); ctx.closePath(); ctx.fill();
				ctx.fillStyle = '#3a2a4a'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 6.28); ctx.fill();
				ctx.fillStyle = '#ff5e6c'; ctx.beginPath(); ctx.arc(-2, -1, 1.5, 0, 6.28); ctx.arc(2, -1, 1.5, 0, 6.28); ctx.fill();
			} else if (e.type === 'guard') {
				ctx.fillStyle = '#8a8f9a'; roundRect(-11, -14, 22, 26, 6); ctx.fill();
				ctx.fillStyle = '#b7bcc7'; ctx.fillRect(-11, -14, 22, 7);
				ctx.fillStyle = '#1a1a22'; ctx.fillRect(-7, -6, 14, 4);
			} else { // mummy
				ctx.fillStyle = '#dfe5d8'; roundRect(-11, -14 + bob, 22, 26, 8); ctx.fill();
				ctx.strokeStyle = 'rgba(120,120,110,.6)'; ctx.lineWidth = 2;
				for (var i = -8; i < 12; i += 6) { ctx.beginPath(); ctx.moveTo(-11, i + bob); ctx.lineTo(11, i + 3 + bob); ctx.stroke(); }
				ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.arc(-3, -8 + bob, 2, 0, 6.28); ctx.arc(3, -8 + bob, 2, 0, 6.28); ctx.fill();
			}
			ctx.restore();
		});
	}

	function drawFog() {
		var r = (torchBoost > 0 ? Math.max(torchR, 240) : torchR);
		var px = player.x - cam.x, py = player.y - cam.y;
		ctx.save();
		ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
		var g = ctx.createRadialGradient(px, py, r * 0.35, px, py, r);
		g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = g;
		ctx.beginPath(); ctx.arc(px, py, r, 0, 6.28); ctx.fill();
		ctx.restore();
		// warm torch tint
		ctx.save(); ctx.globalCompositeOperation = 'lighter';
		var g2 = ctx.createRadialGradient(px, py, 0, px, py, r * 0.8);
		g2.addColorStop(0, 'rgba(255,180,80,.10)'); g2.addColorStop(1, 'rgba(255,180,80,0)');
		ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); ctx.restore();
	}

	function drawMinimap() {
		var mm = 130, pad = 8, scale = Math.min(mm / gridW, mm / gridH);
		var w = gridW * scale, h = gridH * scale, ox = W - w - pad, oy = pad;
		ctx.save();
		ctx.fillStyle = 'rgba(6,8,16,.75)'; roundRect(ox - 4, oy - 4, w + 8, h + 8, 5); ctx.fill();
		for (var y = 0; y < gridH; y++) { for (var x = 0; x < gridW; x++) { if (grid[y][x] === 0) { ctx.fillStyle = 'rgba(150,170,210,.35)'; ctx.fillRect(ox + x * scale, oy + y * scale, scale + 0.5, scale + 0.5); } } }
		var ex = centerOf(player.sx, player.sy);
		dot(ox + (ex.x / TILE) * scale, oy + (ex.y / TILE) * scale, theme().accent);
		if (rescued) { dot(ox + (friend.x / TILE) * scale, oy + (friend.y / TILE) * scale, '#ff79c6'); }
		dot(ox + (player.x / TILE) * scale, oy + (player.y / TILE) * scale, '#4aa0ff');
		ctx.restore();
		function dot(x, y, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.28); ctx.fill(); }
	}

	function drawMsg() {
		ctx.save(); ctx.globalAlpha = Math.min(1, msgT * 2);
		ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(msg, W / 2, 70); ctx.restore();
	}

	function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

	/* -------------------------------- HUD --------------------------------- */

	function updateHud() {
		el.hudScore.textContent = score.toLocaleString();
		el.hudLevel.textContent = 'Lv ' + (levelIndex + 1);
		el.hudTime.textContent = Math.ceil(timeLeft) + 's';
		el.hudTime.style.color = timeLeft < 15 ? '#ff5e6c' : '';
		el.hudLives.textContent = '♥'.repeat(Math.max(0, lives));
		el.hudKeys.textContent = keysNeed ? '🗝 ' + keysHave + '/' + keysNeed : '';
	}
	var toastEl;
	function toast(t) { msg = t; msgT = 1.6; }

	/* --------------------------- initials / lb ---------------------------- */

	var initSlots = ['A', 'A', 'A'], initCursor = 0;
	function showInitials() { state = 'initials'; initSlots = ['A', 'A', 'A']; initCursor = 0; el.initScore.textContent = score.toLocaleString(); renderInitials(); showScreen('screenInitials'); }
	function renderInitials() { el.screenInitials.querySelectorAll('.slot').forEach(function (s, i) { s.querySelector('.slot__ch').textContent = initSlots[i]; s.classList.toggle('slot--active', i === initCursor); }); }
	function cycleSlot(i, d) { var c = (initSlots[i].charCodeAt(0) - 65 + d + 26) % 26; initSlots[i] = String.fromCharCode(65 + c); initCursor = i; renderInitials(); }
	function submitInitials() { Leaderboard.submit(initSlots.join(''), score, levelIndex + 1).then(function () { showLeaderboard(initSlots.join('')); }); }

	function showLeaderboard(highlight) {
		state = 'leaderboard';
		el.lbTitle.textContent = 'High Scores'; el.lbMode.textContent = Leaderboard.mode === 'supabase' ? 'online' : 'this device';
		el.lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading">Loading…</td></tr>';
		showScreen('screenLeaderboard');
		Leaderboard.top().then(function (rows) {
			if (!rows.length) { el.lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading">No scores yet — be the first!</td></tr>'; return; }
			var used = false;
			el.lbBody.innerHTML = rows.map(function (row, i) {
				var me = !used && highlight && row.initials === highlight && row.score === score; if (me) { used = true; }
				return '<tr' + (me ? ' class="lb-me"' : '') + '><td>' + (i + 1) + '</td><td class="lb-ini">' + esc(row.initials) + '</td><td class="lb-score">' + Number(row.score).toLocaleString() + '</td><td>' + (row.stage || '-') + '</td></tr>';
			}).join('');
		});
	}
	function refreshTitleTop() { Leaderboard.top(1).then(function (rows) { el.titleTop.textContent = rows.length ? 'Best: ' + Number(rows[0].score).toLocaleString() + ' — ' + rows[0].initials : ''; }); }
	function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

	/* ------------------------------ screens ------------------------------- */

	function showScreen(id) {
		['screenTitle', 'screenHowto', 'screenIntro', 'screenPause', 'screenGameover', 'screenInitials', 'screenLeaderboard']
			.forEach(function (s) { el[s].hidden = (s !== id); });
	}
	function showTitle() { state = 'title'; showScreen('screenTitle'); refreshTitleTop(); }
	function togglePause() { if (state === 'playing') { state = 'paused'; showScreen('screenPause'); } else if (state === 'paused') { showScreen(null); state = 'playing'; lastTime = performance.now(); } }

	/* ------------------------------- setup -------------------------------- */

	function boot() {
		canvas = document.getElementById('game'); ctx = canvas.getContext('2d');
		['hudScore', 'hudLevel', 'hudTime', 'hudLives', 'hudKeys', 'screenTitle', 'screenHowto', 'screenIntro',
		 'screenPause', 'screenGameover', 'screenInitials', 'screenLeaderboard', 'introLevel', 'introName', 'introTag',
		 'goTitle', 'goScore', 'goSub', 'initScore', 'lbBody', 'lbMode', 'lbTitle', 'titleTop'].forEach(function (id) { el[id] = document.getElementById(id); });
		resize(); window.addEventListener('resize', resize);
		bindInput(); bindButtons(); showTitle();
		lastTime = performance.now(); raf = requestAnimationFrame(loop);
	}
	function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }

	function pt(cx, cy) { var r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H }; }
	function bindInput() {
		canvas.addEventListener('touchstart', tmove, { passive: false });
		canvas.addEventListener('touchmove', tmove, { passive: false });
		canvas.addEventListener('touchend', function () { input.touch = null; });
		function tmove(e) { var t = e.touches[0]; if (t && player) { var p = pt(t.clientX, t.clientY); var dx = p.x - (player.x - cam.x), dy = p.y - (player.y - cam.y), m = Math.hypot(dx, dy); input.touch = m > 10 ? { dx: dx / m, dy: dy / m } : { dx: 0, dy: 0 }; } e.preventDefault(); }

		document.addEventListener('keydown', function (e) {
			var k = e.key.toLowerCase();
			if (state === 'initials') { return initKey(e); }
			if (k === 'arrowup' || k === 'w') { input.up = true; }
			else if (k === 'arrowdown' || k === 's') { input.down = true; }
			else if (k === 'arrowleft' || k === 'a') { input.left = true; }
			else if (k === 'arrowright' || k === 'd') { input.right = true; }
			else if (k === 'p' || k === 'escape') { togglePause(); }
			else if (k === ' ' || k === 'enter') { if (state === 'title') { startGame(); } else if (state === 'intro') { beginPlay(); } }
			if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) !== -1) { e.preventDefault(); }
		});
		document.addEventListener('keyup', function (e) {
			var k = e.key.toLowerCase();
			if (k === 'arrowup' || k === 'w') { input.up = false; }
			else if (k === 'arrowdown' || k === 's') { input.down = false; }
			else if (k === 'arrowleft' || k === 'a') { input.left = false; }
			else if (k === 'arrowright' || k === 'd') { input.right = false; }
		});
	}
	function initKey(e) {
		var k = e.key;
		if (/^[a-zA-Z]$/.test(k)) { initSlots[initCursor] = k.toUpperCase(); if (initCursor < 2) { initCursor++; } renderInitials(); }
		else if (k === 'ArrowUp') { cycleSlot(initCursor, 1); }
		else if (k === 'ArrowDown') { cycleSlot(initCursor, -1); }
		else if (k === 'ArrowLeft') { initCursor = Math.max(0, initCursor - 1); renderInitials(); }
		else if (k === 'ArrowRight') { initCursor = Math.min(2, initCursor + 1); renderInitials(); }
		else if (k === 'Backspace') { initCursor = Math.max(0, initCursor - 1); renderInitials(); }
		else if (k === 'Enter') { submitInitials(); }
		e.preventDefault();
	}
	function bindButtons() {
		on('btnPlay', startGame); on('btnHow', function () { showScreen('screenHowto'); }); on('btnHowClose', showTitle);
		on('btnTitleLb', function () { showLeaderboard(null); });
		on('btnResume', togglePause); on('btnPauseMenu', showTitle);
		on('btnAgain', startGame); on('btnGoLb', function () { showLeaderboard(null); }); on('btnMenu', showTitle);
		on('btnInitEnter', submitInitials); on('btnLbAgain', startGame); on('btnLbMenu', showTitle);
		el.screenInitials.querySelectorAll('.slot').forEach(function (slot, i) {
			slot.querySelector('.slot__up').addEventListener('click', function () { cycleSlot(i, 1); });
			slot.querySelector('.slot__down').addEventListener('click', function () { cycleSlot(i, -1); });
			slot.addEventListener('click', function (e) { if (!e.target.closest('button')) { initCursor = i; renderInitials(); } });
		});
	}
	function on(id, fn) { var n = document.getElementById(id); if (n) { n.addEventListener('click', fn); } }

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
	else { boot(); }
})();
