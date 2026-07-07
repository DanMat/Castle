/*
 * Castle level definitions — pure data.
 *
 * Each level's maze is generated at run time from these parameters (cols/rows
 * are maze cells; the tile grid is 2*cols+1 wide). Difficulty ramps via size,
 * enemy counts, the timer, and the torch (fog-of-war) radius. `keys` gates the
 * friend behind a locked door; grab the key first, then rescue and escort them
 * to the exit before the clock runs out.
 */
window.CASTLE_LEVELS = [
	{ name: 'The Gatehouse',  tag: 'Find your friend',        cols: 9,  rows: 7,  time: 70, mummies: 2, bats: 0, guards: 0, treasure: 5,  keys: 0, hourglass: 1, powerups: 1, spikes: 0,  torch: 999, theme: 'stone' },
	{ name: 'Cold Cellars',   tag: 'Grab the key',            cols: 10, rows: 8,  time: 72, mummies: 3, bats: 0, guards: 0, treasure: 6,  keys: 1, hourglass: 1, powerups: 2, spikes: 2,  torch: 999, theme: 'cellar' },
	{ name: 'The Long Hall',  tag: 'Bats in the rafters',     cols: 12, rows: 8,  time: 78, mummies: 3, bats: 2, guards: 0, treasure: 7,  keys: 1, hourglass: 1, powerups: 2, spikes: 3,  torch: 999, theme: 'hall' },
	{ name: 'Torchless Crypt', tag: 'Light is short',         cols: 12, rows: 9,  time: 82, mummies: 3, bats: 2, guards: 1, treasure: 8,  keys: 1, hourglass: 2, powerups: 3, spikes: 4,  torch: 150, theme: 'crypt' },
	{ name: 'Guard Barracks', tag: 'Patrols on the prowl',    cols: 13, rows: 9,  time: 86, mummies: 3, bats: 2, guards: 2, treasure: 9,  keys: 1, hourglass: 2, powerups: 3, spikes: 5,  torch: 999, theme: 'stone' },
	{ name: 'The Dark Maze',  tag: 'Trust your torch',        cols: 14, rows: 10, time: 92, mummies: 4, bats: 3, guards: 2, treasure: 10, keys: 1, hourglass: 2, powerups: 3, spikes: 6,  torch: 130, theme: 'crypt' },
	{ name: 'Spike Corridors', tag: 'Mind your step',         cols: 15, rows: 10, time: 96, mummies: 4, bats: 3, guards: 3, treasure: 11, keys: 1, hourglass: 3, powerups: 4, spikes: 10, torch: 999, theme: 'cellar' },
	{ name: 'The Keep',       tag: 'Escape the castle',       cols: 16, rows: 11, time: 105,mummies: 5, bats: 4, guards: 3, treasure: 12, keys: 1, hourglass: 3, powerups: 4, spikes: 8,  torch: 120, theme: 'crypt' }
];
