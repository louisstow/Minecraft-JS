//MC
var TILE = 32,
	MAP = {},
	players = {},
	inventory = [],
	selected = 0,
	me,
	W = 512,
	H = 416,
	socket = io.connect("http://webtop.co:8056");

function toGrid(n) {
	if(!(n % TILE)) return n;
	return Math.floor(n / TILE) * TILE;
};

function setupPlayer() {
	me = Crafty.e("2D, Canvas, player_u, Controls, Twoway, Collision")
			.crop(6,0,20,64)
			.twoway(2,6.5)
			.attr({x: Crafty.viewport.width / 2, z: 2, chunk: [0, 0], location: "", loading: 0, _gy: 0, _gravity: 0.2, _falling: true})
			.bind("KeyDown", function(e) {
				if(this.isDown(Crafty.keys.A) || this.isDown(Crafty.keys.LEFT_ARROW)) 
					this.sprite(36,2,1,2);
				if(this.isDown(Crafty.keys.D) || this.isDown(Crafty.keys.RIGHT_ARROW))
					this.sprite(37,2,1,2);
			})
			.bind("EnterFrame", function() {
				if(this._falling) {
					//if falling, move the players Y
					if(this._gy < 20) this._gy += this._gravity * 2;
					this.y += this._gy;
				} else {
					this._gy = 0; //reset change in y
				}
				
				var collision = this.hit("solid"),
					dx, dy, i = 0, l = collision.length, box;
					
				//if colliding with a block
				if(collision) {
					
					for(; i < l; ++i) {
						box = collision[i].obj;
						
						//object must be solid
						dx = Math.abs(box._x - this._x);
						dy = Math.abs(box._y - (this._y + this._h));
						
						//check gravity first
						if(dy <= 16 && this._falling) {
							this.y = box._y - this._h;
							this._falling = false;
							if(this._up) this._up = false;
						} else {
							//if sticking out of the ground
							if(dy > 16) {
								//check for above blocks
								if(dy - this._h > 16) {
									this.y = box._y + TILE;
								} else {
									//check for player walking left
									if(dx > 16 && this._x > box._x) {
										this.x = box._x + TILE;
									}
									
									//check for player walking right
									if(dx - this._w < 16 && this._x < box._x) {
										this.x = box._x - this._w;
									}
								}
							}
						}
					}
				} else {
					this._falling = true;
				}
				
				var key = toGrid(this._x) + "," + toGrid(this._y); 
				if(key !== this.location) {
					this.location = key;
					
					//send to the server
					socket.emit("updatepos", {chunk: this.chunk, pos: {x: this._x, y: this._y}});
				}
				
				if(this._x + Crafty.viewport._x < Crafty.viewport.width / 4) {
					Crafty.viewport.x += 2;
				}
				
				if(this._x + this._h + Crafty.viewport._x > Crafty.viewport.width - (Crafty.viewport.width / 4)) {
					Crafty.viewport.x -= 2;
				}
				
				if(this._y + Crafty.viewport._y < Crafty.viewport.height / 4) {
					Crafty.viewport.y += this._gy;
				}
				
				if(this._y + this._h + Crafty.viewport._y > Crafty.viewport.height - (Crafty.viewport.height / 4)) {
					Crafty.viewport.y -= 2;
				}
				
				if(this.loading) return;
				
				var w = Math.floor((-Crafty.viewport._x + W) / W),
					e = Math.floor((-Crafty.viewport._x) / W),
					s = Math.floor((-Crafty.viewport._y + H) / H),
					n = Math.floor((-Crafty.viewport._y) / H),
					count = 0;
					
				
				if(e != this.chunk[0] && !MAP[e + "," + this.chunk[1]]) {
					socket.emit("newchunk", e, this.chunk[1]);
					count++;
				}
				
				if(w != this.chunk[0] && !MAP[w + "," + this.chunk[1]]) {
					socket.emit("newchunk", w, this.chunk[1]);
					count++;
				}
				
				if(n != this.chunk[1] && !MAP[this.chunk[0] + "," + n]) {
					socket.emit("newchunk", this.chunk[0], n);
					count++;
				}
				
				if(s != this.chunk[1] && !MAP[this.chunk[0] + "," + s]) {
					socket.emit("newchunk", this.chunk[0], s);
					count++;
				}
				
				if(n != this.chunk[1] && e != this.chunk[0] && !MAP[e + "," + n]) {
					socket.emit("newchunk", e, n);
					count++;
				}
				
				if(n != this.chunk[1] && w != this.chunk[0] && !MAP[w + "," + n]) {
					socket.emit("newchunk", w, n);
					count++;
				}
				
				if(s != this.chunk[1] && e != this.chunk[0] && !MAP[e + "," + s]) {
					socket.emit("newchunk", e, s);
					count++;
				}
				
				if(s != this.chunk[1] && w != this.chunk[0] && !MAP[w + "," + s]) {
					socket.emit("newchunk", w, s);
					count++;
				}
				
				this.chunk[0] = Math.floor(this._x / W);
				this.chunk[1] = Math.floor(this._y / H);
				
				this.loading = count;
			});
}

function loadMap(chunk, data) {
	var c = chunk.split(","),
		x = 0, xlen, y, ylen,
		cx = +c[0] * W, cy = +c[1] * H,
		block;
		
	//set or get the data
	if(MAP[chunk] && !data) data = MAP[chunk];
	else MAP[chunk] = data;
	xlen = data.length;	
		
	//loop over x
	for(; x < xlen; ++x) {
		//loop y
		for(y = 0, ylen = data[x].length; y < ylen; ++y) {
			//skip if no block
			if(!data[x][y]) continue;
			
			block = SpriteMap[data[x][y]];
			
			data[x][y] = Crafty.e("2D, solid, Canvas, " + block)
							.attr({x: cx + x * TILE, y: cy + y * TILE, type: block, col: x, row: y, chunk: chunk});
		}
	}
}

$(function() {
	Crafty.init(512, 416);
	
	//preload all assets
	Crafty.load(["assets/sprite.png", "assets/sprite16.png"], function() {
		$("#login").show();
		
		$("#subm").click(function() {
			var name = $("#nick").val();
			socket.on("error", function() {
				$("#login .msg").show();
			});
			
			socket.on("generate", function(data) {
				$("#login").hide();
				$("#subm").unbind();
				
				MAP["0,0"] = data;
				
				Crafty.scene("main");
			});
			
			socket.emit("name", name);
		});
		
		generateSprites();
		initList();
	});
	
	Crafty.scene("main", function() {
		$("#inventory").show();
		setupPlayer();
		loadMap("0,0");
		
		socket.on("playermove", function(data) {
			//create player if not exists
			var p, x, y, chunk, pos;
			if(!players[data.name]) 
				players[data.name] = Crafty.e("NPC").npc(data.name);
				
			p = players[data.name];
			chunk = data.pos.chunk;
			pos = data.pos.pos;
			
			x = pos.x;
			y = pos.y;
			
			p.attr({x: x, y: y});
		});
		
		socket.on("playerleave", function(name) {
			if(players[name]) {
				players[name].destroy();
				delete players[name];
			}
		});
		
		socket.on("newchunk", function(data) {
			me.loading--;
			loadMap(data.key, data.data);
		});
		
		socket.on("blockchange", function(data) {
			//don't care
			if(!MAP[data.chunk]) return;
			
			if(data.a === 0) {
				var b = MAP[data.chunk][data.x][data.y];
				b.destroy();
			} else if(data.a === 1) {
				var c = data.chunk.split(","),
					cx = +c[0] * W, cy = +c[1] * H,
					x = data.x, y = data.y,
					block = SpriteMap[data.b],
					b;
					
				//remove it if it exists
				if(MAP[data.chunk][x][y]) MAP[data.chunk][x][y].destroy();
				delete MAP[data.chunk][x][y];
				
				MAP[data.chunk][x][y] = Crafty.e("2D, solid, Canvas, " + block)
							.attr({x: cx + x * TILE, y: cy + y * TILE, type: block, col: x, row: y, chunk: data.chunk});
			}
		});
		
		$(Crafty.stage.elem).mousedown(clickHandler);
		$(document).mousewheel(scroll);
		$(document).keydown(function(e) {
			if(e.which === Crafty.keys.E || e.which === Crafty.keys.I) {
				$("#list").toggle();
			}
		});
	});
});

function initList() {
	var i = 0, s = SpriteMap, l = s.length,
		html = "", o;
	
	for(; i < l; ++i) {
		o = SpriteMap[i];
		
		html += "<li data-id='"+i+"' style='background: url(assets/sprite16.png) no-repeat ";
		html += "-" + (Sprites[o][0] * 16) + "px -" + (Sprites[o][1] * 16) +"px";
		html += "'></li>"
	}
	
	$("#list ul").html(html);
	var list = $("#list li");
	list.click(function() {
		var i = +$(this).attr("data-id"),
			s = Sprites[SpriteMap[i]];
			
		inventory[selected] = i;
		$("#inventory a").eq(selected).css("background", "url(assets/sprite.png) no-repeat -" + (s[0] * TILE) + "px -" + (s[1] * TILE) +"px");
	});
}

function clickHandler(e) {
	var block,
		type = SpriteMap[inventory[selected]],
		x, y;
	
	if(e.which === 1) {
		block = findBlock(e);
		if(block) {
			socket.emit("updatemap", {a: 0, x: block.col, y: block.row, chunk: block.chunk});
			
			delete MAP[block.chunk][block.col][block.row];
			block.destroy();
		}
	} else if(e.which === 3) {
		//if nothing selected, don't place anything
		if(inventory[selected] === undefined) {
			return;
		}
		
		block = Crafty.DOM.translate(e.clientX, e.clientY);
		
		x = Math.floor(block.x / TILE) % 16;
		y = Math.floor(block.y / TILE) % 13;
		var chunk = Math.floor(block.x / W) + "," + Math.floor(block.y / H);
		
		//within reach 
		if(Math.abs(block.x - (me._x + 10)) < 60 && Math.abs(block.y - (me._y + TILE)) < 60) {
			//if block contained
			console.log(chunk, x, y);
			if(!MAP[chunk][x] || MAP[chunk][x][y]) { console.log("no MAP"); return; }
			
			
			if(x > 0 && x < 13 && y > 0 && y < 16 && !MAP[chunk][x-1][y] && !MAP[chunk][x][y-1] && !MAP[chunk][x+1][y] && !MAP[chunk][x][y+1]) {
				console.log("no surrounding");
				return;
			}
			
			MAP[chunk][x][y] = Crafty.e("2D, solid, Canvas, " + type)
							.attr({x: toGrid(block.x), y: toGrid(block.y), type: type, col: x, row: y, chunk: chunk});
							
			socket.emit("updatemap", {a: 1, x: x, y: y, b: inventory[selected], chunk: chunk});
		}
	}
}

function scroll(e,d) { //Scroll through inventory
	var s = selected;
	
	function select(i) {
		var list = $("#inventory a");
		list.parent().removeClass('over');
		list.eq(i).parent().addClass('over');
		selected = i;
	}
	
	if(d < 0) {
		if(s + 1 >= 9) s = -1;
		select(s + 1 % 9);
	} else {
		if(s - 1 < 0) s = 9;
		select(s - 1 % 9);
	}
};

function findBlock(e) {
	//starting point
	var x0 = me._x + 10,
		y0 = me._y + TILE,
		//get the position on the stage (not the document)
		trans = Crafty.DOM.translate(e.clientX, e.clientY),
		//end point
		x1 = trans.x,
		y1 = trans.y,
		dx = Math.abs(x1 - x0),
		dy = Math.abs(y1 - y0),
		x = x0,
		y = y0,
		n = 100,
		x_inc = (x1 > x0) ? 1 : -1,
		y_inc = (y1 > y0) ? 1 : -1,
		error = dx - dy;
		
	dx *= 2;
	dy *= 2;

	for (; n > 0; n-=1) {
		//find along the path in the Crafty HashMap
		var q = Crafty.map.search({_x: ~~x, _y: ~~y, _w: 1, _h: 1}),
			i = 0, l = q.length,
			found, current;
			
		for(;i<l;++i) {
			current = q[i];
			if(current !== me && current._visible && current.has('solid')) {
				found = current;
				break;
			}
		}
		
		if(found) {
			return found;
		}

		if (error > 0) {
			x += x_inc;
			error -= dy;
		} else {
			y += y_inc;
			error += dx;
		}
	}
}

Crafty.c("NPC", {
	init: function() {
		this.addComponent("2D, DOM, player_u");
		
		//remove the nametag
		this.bind("Remove", function() {
			this.text.destroy();
		});
	},
	
	npc: function(name) {
		this.text = Crafty.e("2D, DOM, Text, Name")
			.attr({w: 50, h: 20, x: this._x - 10, y: this._y - 20})
			.text(name);
		this.attach(this.text);
		
		return this;
	}
});