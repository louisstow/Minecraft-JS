/**
* Beware of the magic numbers!
*/
var W = 512,
	H = 416,
	TILE = 32,
	MAP = {};

function randRange(from, to) {
	return Math.floor(Math.random() * (to - from + 1) + from);
}
	
/**
* Generate Top soild
*/
function genTop(map) {
	var lastY = 12,
		x, y;
	
	//loop over horizontally
	for(x = 0; x < 16; ++x) {
		if(!map[x]) map[x] = [];
		
		//some varience to the terrain
		lastY = (lastY == 12 ? randRange(lastY - 2, lastY) : randRange(lastY - 1, lastY + 1));
		
		for(y = lastY; y  < 13; ++y) {
			if(y === lastY) {
				map[x][y] = 11;
			} else {
				map[x][y] = 28;
			}
		}
	}
}

/**
* Generate underground
*/
function genMiddle(map, level) {
	var x, y, r;
	
	for(x = 0; x < 16; ++x) {
		if(!map[x]) map[x] = [];
		
		for(y = 0; y < 13; ++y) {
			r = randRange(1, 100);
			
			if(level == 1) {
				//choose iron or stone
				map[x][y] = (r > 85) ? 15 : 30;
			} else if(level == 2) {
				if(r > 95) map[x][y] = 5
				else if(r > 85) map[x][y] = 10;
				else if(r > 70) map[x][y] = 15;
				else map[x][y] = 30;
			} else if(level == 2) {
				map[x][y] = 37;
			}
		}
	}
}
	
/**
* Generate a new chunk
*/
this.generate = function(chunkX, chunkY) {
	//initialize the giant array
	if(!MAP[chunkX+","+chunkY]) MAP[chunkX+","+chunkY] = [];
	var chunk = MAP[chunkX+","+chunkY];
	
	//don't generate the sky
	if(chunkY < 0) return;
	
	//on the ground
	if(chunkY == 0) {
		genTop(chunk);
	} //iron and maybe gold
	else if(chunkY > 0 && chunkY < 2) {
		genMiddle(chunk, 1);
	} //diamond, gold and iron
	else if(chunkY > 2 && chunkY < 5) {
		genMiddle(chunk, 2);
	} //bedrock and lava
	else if(chunkY >= 5) {
		genMiddle(chunk, 3);
	}
};

this.load = function(chunkX, chunkY) {
	//generate if it doesn't exist
	if(!MAP[chunkX+","+chunkY]) this.generate(chunkX, chunkY);
	
	return MAP[chunkX+","+chunkY];
}

this.updateBlock = function(key, data) {
	if(!MAP[key]) return;
	console.log(key, data, MAP[key]);
	
	//if remove
	if(data.a === 0) {
		if(!MAP[key][data.x]) return;
		delete MAP[key][data.x][data.y];
	} //if add
	else if(data.a === 1) {
		if(MAP[key][data.x][data.y]) return;
		MAP[key][data.x][data.y] = data.b;
	}
}