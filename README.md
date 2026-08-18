# Castle 🏰🕯️

> A top-down maze **chase & rescue** — you're lost in a haunted castle. Dodge the mummies, grab the key, rescue your friend and escort them to the exit before the timer runs out.

[![Play the demo](https://img.shields.io/badge/▶_Play-Live_Demo-ffcf6b?style=for-the-badge)](https://danmat.github.io/Castle/)
&nbsp;
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-no_dependencies-f7df1e)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

<p align="center">
  <img src="docs/screenshot.png" alt="Castle gameplay — a hero in a top-down stone maze with chasing mummies, gems, a friend to rescue and a minimap" width="720" />
</p>

## What is it?

The original Castle was a little Akihabara-engine maze game. This is a ground-up
rebuild in **dependency-free vanilla JavaScript** on a plain canvas that keeps
the heart of it — run through a castle, dodge the mummies, find your friend —
and layers on a full arcade loop: **8 generated levels**, torchlight fog, keys,
power-ups, spike traps, a **rescue-and-escort** objective and an online
leaderboard. All art is drawn procedurally (no image assets).

## How to play

- 🎮 **Move** with WASD / arrow keys (or drag on touch). The **camera follows you**.
- 👻 **Mummies, bats and guards** chase you — one touch costs a life (you have 3).
- 🗝️ Grab the **key**, find and **rescue your friend**, then **escort them to the glowing exit** before time runs out.
- 💎 Collect **gems** for score (chain them for a **combo**) and **⏳ hourglasses** for more time.
- ⚡ **Power-ups**: *Freeze* stops the mummies, *Sprint* speeds you up, *Torch* widens your view.
- ⚔️ Dodge **spike traps**, and lean on the **minimap** to navigate.

## Features

- 🧩 **8 escalating levels** — each a freshly generated maze (endlessly replayable).
- 🕯️ **Torchlight / fog-of-war** on the darker levels for real "lost in a castle" tension.
- 👥 **Enemy variety** — shambling mummies (chasers), fast bats, patrolling guards.
- 🤝 **Rescue & escort** — your friend follows your trail once found.
- 🏆 **Online leaderboard** (time + treasure + no-hit bonuses) with retro initials entry.
- 🕹️ Keyboard + touch, fully responsive.

## High scores

High scores go to a **shared Cloudflare leaderboard** — a Worker + D1
([retroix-leaderboard](https://github.com/DanMat/retroix-leaderboard)) shared by all of
Dan's Retroix games and namespaced by `gameId`, so this game's board is its own. It
works out of the box (no account, no setup) and validates + caps scores server-side.
Blank `apiUrl` in [`js/config.js`](js/config.js) to fall back to a local
(per-browser) board.

> Any client-side leaderboard can be spoofed by a determined player — it's for fun, not competition.

## Play locally

It's a static site — no build step:

```bash
git clone https://github.com/DanMat/Castle.git
cd Castle
python3 -m http.server 8000   # then visit http://localhost:8000
```

## How it works

| File | Responsibility |
| --- | --- |
| `js/game.js` | Canvas engine: maze generation, camera, movement/collision, chasing-enemy pathfinding (BFS), fog, items, escort, HUD, state machine. |
| `js/levels.js` | Pure-data level parameters (size, enemies, timer, torch radius, theme). |
| `js/config.js` | Leaderboard API URL and game id. |

## Credits

Rebuilt in vanilla JavaScript from the original Akihabara-engine version.

## License

[MIT](LICENSE) © DanMat
