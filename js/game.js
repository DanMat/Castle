/*Dragon Prince*/

//global variale declaration
var prince;		
var timeLimit=60;
var timeStarted;
var frameCount = 0;

//we load the resources
window.addEventListener('load', Resources, false);

function Resources()
{

	/*Help module provides some Javascript-specific functions, such object copying, randomizing functions, string/array handlers and the akihabaraInit function.*/
	help.akihabaraInit
	({
		title:  'Castle',
		splash:{footnotes:["Created by Dragon Prince"]},
		width:  window.innerWidth,
		height: 400,
		zoom:   1
	});

	/*
	Gamebox module allows multiple grouped objects to move simultaneously, it helps with collisions, rendering and moving objects. It also provides monospaced pixel-font rendering, keyboard handling, audio, double buffering and eventually FSEs. Gamebox can also store and load data from cookies!
	*/

	//import the images
	gbox.addImage('logo', 'images/logo.png');
	gbox.addImage('dan', 'images/dan.png');
	gbox.addImage('enemy_sprite','images/enemy_sprite.png');
	gbox.addImage('princess', 'images/princess.png');
	gbox.addImage('mappy', 'images/map_pieces.png');
	gbox.addImage('font', 'images/font.png');

   
	//adding the tiles to the engine
	gbox.addTiles
	({
		id:      'player_dan', 
		image:   'dan',
		tileh:   64,
		tilew:   64,
		tilerow: 32,
		gapx:    0,
		gapy:    0
	});	


	gbox.addTiles
	({
		id:      'enemy_tile',
		image:   'enemy_sprite',
		tilew:   64,
		tileh:   64,
		tilerow: 32,
		gapx:    0,
		gapy:    0
	});


	gbox.addTiles
	({
		id:      'princess_id', 
		image:   'princess', 
		tileh:   64,
		tilew:   64,
		tilerow: 32,
		gapx:    0,
		gapy:    0
  });
  
  
	gbox.addTiles
	({
		id:      'map_pie',
		image:   'mappy',
		tileh:   64,
		tilew:   64,
		tilerow: 32,
		gapx:    0,
		gapy:    0
	});


	gbox.addFont
	({ 
		id:          'small', 
		image:       'font', 
		firstletter: ' ', 
		tileh:       8, 
		tilew:       8, 
		tilerow:     255, 
		gapx:        0, 
		gapy:        0 
	}); 

	//load the main function once the resources are loaded
	gbox.loadAll(main);
}

function main()
{
	//The order in which things/groups must be rendered in the game
	gbox.setGroups(['map','player','enemy','peach','gamy']);


	/*Gamecycle contains your basic game loop: intro, menus, crossfading between stages/lifes, gameover and ending.*/

	//the global variable is made as a game object
	prince=gamecycle.createMaingame('gamy','gamy'); 

  
	//gameTitleIntroAnimation inside gamecycle.js renders that dumb “GAME TITLE” thing. So, we override it to include our custom design
	prince.gameTitleIntroAnimation=function(reset) 
	{
		if (reset) 
		{
			/*Toys module provides lots of common routines during the game developing: from effects for screen titles to HUD handling to platform/SHMUP/RPG oriented routines, like jumping characters, Z-Indexed objects, bullets, sparks, staff rolls, bonus screens, dialogues etc.*/
	
			//Reset is true(state is maintained gamecycle.js) by before the title intro animation. So, we are announcing to "toys" to expect for a local data store called custom

			toys.resetToy(this, 'custom');
		}
		else
		{
			//This is like a clear screen statement
			gbox.blitFade(gbox.getBufferContext(),{ color: (0,0,0) });
 
			toys.logos.linear(this, 'custom', 
			{
				image: 'logo',
				sx:    gbox.getScreenW(),
				sy:    gbox.getScreenH(),
				x:     gbox.getScreenW()/2-gbox.getImage('logo').width/2,
				y:     20,
				speed: 5
			});
		}
	};
  
  
  
	//There is a bug in the pressStartIntroAnimation function of the framework so we override it
	prince.pressStartIntroAnimation=function(reset) 
	{
		if (reset) 
		{
			toys.resetToy(this,"text");
		}
		else
		{
			toys.text.blink(this,"text",gbox.getBufferContext(),
			{
				font:       "small",
				text:       "PRESS Z TO START",
				valign:     gbox.ALIGN_MIDDLE,
				halign:     gbox.ALIGN_CENTER,
				dx:         0,
				dy:         Math.floor(gbox.getScreenH()/3),
				dw:         gbox.getScreenW(),
				dh:         Math.floor(gbox.getScreenH()/3)*2,
				blinkspeed: 10
			});
			return gbox.keyIsHit("a");
		}
	};
  
  
  
	//initializeGame defines all the game objects
	prince.initializeGame = function() 
	{
	//we set the time board
	prince.hud.setWidget('time_left',
	{
		widget: 'label',
		font: 'small',
		value: 60,
		dx: gbox.getScreenW()-40,
		dy: 25,
		clear: true
	});
    
	//We get the current time
	timeStarted=(new Date()).getTime();

	//we add the background,player and enemies
	addPlayer();
	addPrincess();
	addMap();
	/*addEnemy(16*10,16*10,1);
	addEnemy(16*21,16*21,2);
	addEnemy(16*16,16*16,3);*/
	addEnemy(16*25,16*26,4);
	addEnemy(16*19,16*21,5);
	addEnemy(200,200,6);
	};
  
	map=help.finalizeTilemap({ 
								tileset:'map_pie', 
								tileIsSolid: function(obj, t) {return t >= 16;},
								map:help.asciiArtToMap([  
								
								"CzsqqyqrsqqxqtuvwsqxqrsqqyqqtqC",
								"ApfghefghefgheijkefghefghefgheB",
								"AlcdabcdbcdabcdbcdabCCCCCCCCCCC",
								"CCCCCCCmbcdabcdbcdabCEqxrrqvqzF",
								"EqqvqyrlbcdabcdbcdabuwpfghijkhB",
								"ApijkefobcdCCCCCCCmbnfocdabcdaB",
								"AlcdabcdbcdqxqvqxqlbcdbcCCmcdaB",
								"AlcdabCCmcdnfijkfgobcdbcCClcdaB",
								"AlcdabCClcdabcdbcdabcdbcCClcdaB",
								"AlcdabCClcdabCCCCCCCmdbcCCCCCCC",
								"CCCCCCCClcdabrrvqzCCldbcqryqqzF",
								"EzquqvrwlcdabnijkeCCldbcnfghefB",
								"ApfgijkgocdabcdbcdCCldbcdabcdaB",
								"AlcdabcdbcdabcdbcdCCldbcdabcdaB",
								"AlcdabcdbCCCCCCmcdstldbcCCCCCCC",
								"AlcdabcdbCCzqyrlcdnfodbcyqqvrzF",
								"AlcdabcdbCCpfghocdabcdbcnfijkfB",
								"AlcdabcdbCClbcdbcdabcdbcdabcdaB",
								"CDDDDDDDDCCDDDDDDDDDDDDDDDDDDDC",
								], [ [null, ' '], [0, 'a'], [1, 'b'], [2, 'c'], [3, 'd'], [4, 'e'], [5, 'f'], [6, 'g'], [7, 'h'], [8, 'i'], [9, 'j'], [10, 'k'], [11, 'l'], [12, 'm'], [13, 'n'] , [14, 'o'], [15, 'p'], [16, 'q'], [17, 'r'], [18, 's'], [19, 't'], [20, 'u'], [21, 'v'], [22, 'w'], [23, 'x'], [24, 'y'], [25, 'z'], [26, 'A'], [27, 'B'], [28, 'C'], [29, 'D'], [30, 'E'], [31, 'F']])
							});
  
	//we store our ascii map to map_canvas
	gbox.createCanvas('map_canvas', { w: map.w, h: map.h });
	
	//the real rendering of the map takes place here
	gbox.blitTilemap(gbox.getCanvasContext('map_canvas'), map);//This draws the map in the canvas

	//This is where the basic rendering and processing of groups occurs.
	gbox.go();
}



//this function is same as the predefined callInColliding() function. The only change is that we use toys.topview.collides() function instead of toys.topview.pixelcollides()
function callWhenColliding(obj,group,call) 
{
	for (var i in gbox._objects[group]) 
	{
		if ((!gbox._objects[group][i].initialize)&&toys.topview.collides(obj,gbox._objects[group][i])) 
		{
			if (gbox._objects[group][i][call]) 
			{
				gbox._objects[group][i][call](obj);
				return i;
			}
		}
	}
	return false;
}

function addPlayer() 
{
	gbox.addObject({
					id: 'player_id',
					group: 'player',
					tileset: 'player_dan',
					//collision height:we are overriding the default value which is half the sprite height to the entire sprite height
					colh: gbox.getTiles('player_dan').tileh, 
					initialize: function() 
										  {
										    //we initialize a topview game
											toys.topview.initialize(this, { });
											
											//we initialize the players position
											this.x=1500;
											this.y=80;
											
											//we add animation to the character
											this.animList = {
											still:     { speed: 1, frames: [28] },
											right:     { speed: 3, frames: [16, 17, 18, 19, 20, 21, 22, 23] },
											down:      { speed: 3, frames: [24, 25, 26, 27, 28, 29, 30, 31] },
											left:      { speed: 3, frames: [8, 9, 10, 11, 12, 13, 14, 15] },
											up:        { speed: 3, frames: [0, 1, 2, 3, 4, 5, 6, 7]  },
											
											};
											
											this.animIndex = 'still';
										   },
					first: function() 	   
										   {
										    //defining the movement keys
											toys.topview.controlKeys(this, { left: 'left', right: 'right', up: 'up', down: 'down' });
											//if (gbox.keyIsPressed('left'))
											//alert("me");
											
											
											if (this.accx == 0 && this.accy == 0) this.animIndex = 'still';
											if (this.accx > 0 && this.accy == 0)  this.animIndex = 'right';
											if (this.accx == 0 && this.accy > 0)  this.animIndex = 'down';
											if (this.accx < 0 && this.accy == 0)  this.animIndex = 'left';
											if (this.accx == 0 && this.accy < 0)  this.animIndex = 'up';
 
 	
											// Set the animation.
											if (frameCount%this.animList[this.animIndex].speed == 0)
											this.frame = help.decideFrame(frameCount, this.animList[this.animIndex]);
	

											toys.topview.setStaticSpeed(this,5);
											//the physics engine adds the necessary force for movement
											toys.topview.applyForces(this);
											
											//adding deacceleration to the movement
											toys.topview.handleAccellerations(this);
											
											//detect collision with the wall
											toys.topview.tileCollision(this, map, 'map', null, { tolerance: 6, approximation: 3 });
											
											//action to be performed when colided with the enemy
											callWhenColliding(this, 'enemy', 'gameOverFail');
										   },
					blit: function() 
										   {
											gbox.blitTile(gbox.getBufferContext(), {
																					tileset: this.tileset,
																					tile:    this.frame,
																					dx:      this.x,
																					dy:      this.y,
																					fliph:   this.fliph,
																					flipv:   this.flipv,
																					camera:  this.camera,
																					alpha:   1.0
																				   });
											},
					}); 
} 

function addEnemy(xx, yy, enemy_id) 
{
	gbox.addObject ({
						id: 'enemy_id' + enemy_id,
						group: 'enemy',
						tileset: 'enemy_tile',
						colh: gbox.getTiles('enemy_tile').tileh,
						initialize: function () 
												{
												  toys.topview.initialize(this,{
						colh:gbox.getTiles(this.tileset).tileh, 
						colw:gbox.getTiles(this.tileset).tilew,
						 
						
							});
				/*en[enemy_id]=gbox.getObject("enemy","enemy_id"+enemy_id); 
				use a if statement and or all the objects with 'this' using if(gbox.collides(this,en[enemy_id] , 6)) this.x++; */
												  this.x=xx;
												  this.y=yy;
												 
												  
											this.animList = {
											still:     { speed: 1, frames: [31] },
											right:     { speed: 3, frames: [16, 17, 18, 19, 20, 21, 22, 23] },
											down:      { speed: 3, frames: [24, 25, 26, 27, 28, 29, 30, 31] },
											left:      { speed: 3, frames: [8, 9, 10, 11, 12, 13, 14, 15] },
											up:        { speed: 3, frames: [0, 1, 2, 3, 4, 5, 6, 7]  },
											
											};
											
											this.animIndex = 'still';
												},
						first: function() 
												{
												
												if (this.accx == 0 && this.accy == 0) this.animIndex = 'still';
											if (this.accx >= 0 && this.accy == 0)  this.animIndex = 'right';
											if (this.accx == 0 && this.accy >= 0)  this.animIndex = 'down';
											if (this.accx < 0 && this.accy == 0)  this.animIndex = 'left';
											if (this.accx == 0 && this.accy < 0)  this.animIndex = 'up';
 
 	
											// Set the animation.
											if (frameCount%this.animList[this.animIndex].speed == 0)
											this.frame = help.decideFrame(frameCount, this.animList[this.animIndex]);
											
											
												  toys.topview.setStaticSpeed(this,3); 													  
													
												  //we get the details of the player
												  var mario=gbox.getObject("player","player_id"); 
												  
												 
												  if ((this.facing==toys.FACE_UP)||(this.facing==toys.FACE_DOWN)) 
												  { 
												    //player is on the right
													if (mario.x>this.x) 
														toys.topview.controlKeys(this,{pressright:1}); 
													
													//player is on the left
													else if (mario.x<this.x) 
														toys.topview.controlKeys(this,{pressleft:1}); 
												  } 
												  else 
												  {
												    //player is down
													if (mario.y>this.y) 
														toys.topview.controlKeys(this,{pressdown:1}); 
														
													//player is up
													else if (mario.y<this.y) 
														toys.topview.controlKeys(this,{pressup:1}); 								
												  }
												  toys.topview.applyForces(this);
												 
												 
												 //if(check>=6)
												 //if((gbox.collides(this,en[1] , 0))||(gbox.collides(this,en[2] , 0))||(gbox.collides(this,en[3] , 0))||(gbox.collides(this,en[4] , 0))||(gbox.collides(this,en[5] , 0))||(gbox.collides(this,en[6] , 0)))
												//alert("me");
												 
												
												  switch(prince.difficulty)
												  {
													case 0:
													case 1:	
															toys.topview.tileCollision(this, map, 'map', null, { tolerance: 6, approximation: 3 });
												  }
											  
												},
						blit: function() 
												{
												  gbox.blitTile(gbox.getBufferContext(), {
																							tileset: this.tileset,
																							tile:    this.frame,
																							dx:      this.x,
																							dy:      this.y,
																							fliph:   this.fliph,
																							flipv:   this.flipv,
																							camera:  this.camera,
																							alpha:   1.0
																						 });
	  
												},
						gameOverFail: function() 
												{
													prince.setState(700);
												},
					});
}


function addPrincess() 
{
	gbox.addObject({
						id: 'prin_id',
						group: 'peach',
						tileset: 'princess_id',
						colh: gbox.getTiles('princess_id').tileh, 
						initialize: function() 
												{
												  toys.topview.initialize(this, { });
												  //this.x=help.random(200,500);
												  //this.y=help.random(480,640);
												  this.x=90;
												  this.y=1020;
												  
												  //we add animation to the character
											this.animList = {
											still:     { speed: 1, frames: [28] },
											right:     { speed: 3, frames: [16, 17, 18, 19, 20, 21, 22, 23] },
											down:      { speed: 3, frames: [24, 25, 26, 27, 28, 29, 30, 31] },
											left:      { speed: 3, frames: [8, 9, 10, 11, 12, 13, 14, 15] },
											up:        { speed: 3, frames: [0, 1, 2, 3, 4, 5, 6, 7]  },
											
											};
											
											this.animIndex = 'still';
												},
						first: function() 
												{
												  toys.topview.controlKeys(this, { left: 'right', right: 'left', up: 'down', down: 'up' });
												  
												  											if (this.accx == 0 && this.accy == 0) this.animIndex = 'still';
											if (this.accx > 0 && this.accy == 0)  this.animIndex = 'right';
											if (this.accx == 0 && this.accy > 0)  this.animIndex = 'down';
											if (this.accx < 0 && this.accy == 0)  this.animIndex = 'left';
											if (this.accx == 0 && this.accy < 0)  this.animIndex = 'up';
 
 	
											// Set the animation.
											if (frameCount%this.animList[this.animIndex].speed == 0)
											this.frame = help.decideFrame(frameCount, this.animList[this.animIndex]);
											
												  toys.topview.handleAccellerations(this);
												  toys.topview.applyForces(this);
												  toys.topview.tileCollision(this, map, 'map', null, { tolerance: 6, approximation: 3 });//these r parameters passed to the collision algorith reg de tolerance:how strict collision should be, approx:how precise collision should be between player n wall

												  //collision detection with the plyer
												 /* for (var i in gbox._objects['player']) 
												  {
													if ((!gbox._objects['player'][i].initialize)&&toys.topview.collides(this,gbox._objects['player'][i])) 
													{
													    //This is a predefined case statement
														prince.setState(801);
	
													}
												  }*/
												  var mario=gbox.getObject("player","player_id"); 
												  if(gbox.collides(this, mario, 6))
												  prince.setState(801);
												  switch(prince.difficulty)
												  {
													case 1:
													case 2:	
															callWhenColliding(this, 'enemy', 'gameOverFail');
												  }
													
												},
						blit: function() 
												{
												  gbox.blitTile(gbox.getBufferContext(), {
																							tileset: this.tileset,
																							tile:    this.frame,
																							dx:      this.x,
																							dy:      this.y,
																							fliph:   this.fliph,
																							flipv:   this.flipv,
																							camera:  this.camera,
																							alpha:   1.0
																						 });
												},
					}); 
} 


function addMap() 
{
	gbox.addObject({
					id: 'map_id',
					group: 'map',
					first: function() {
							// Increment the global frame counter.
							frameCount++;
							},
					blit: function() {
										//redirecting the camera to follow the player
										gbox.centerCamera(gbox.getObject('player', 'player_id'), {w: map.w, h: map.h});
										
										//This variable stores the amt of time that has passed so far
										seconds=((new Date()).getTime()-timeStarted)/1000;
										
										//setting up the counter
										prince.hud.setValue('time_left', 'value', Math.ceil(timeLimit - seconds));
										
										//drawing the widget
										prince.hud.redraw();
										
										if(seconds>=timeLimit)
										prince.setState(700);
										
										//clear the screen once nd draw the map
										gbox.blitFade(gbox.getBufferContext(), { alpha: 1 });
										gbox.blit(gbox.getBufferContext(), gbox.getCanvas('map_canvas'), 
																										{ 
																										 dx: 0, 
																										 dy: 0, 
																										 dw: gbox.getCanvas('map_canvas').width, 
																										 dh: gbox.getCanvas('map_canvas').height, 
																										 sourcecamera: true 
																										});
									 }
					});
}