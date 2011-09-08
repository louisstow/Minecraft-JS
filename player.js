var players = {},
	names = {};

this.add = function(chunkX, chunkY, name, pos, socket) {
	var key = chunkX + ',' + chunkY;
		
	if(!players[key]) players[key] = [];
	
	players[key].push({name: name, pos: pos, socket: socket});
	
	return key;
}

this.updatePosition = function(oldPos, name, newPos, socket) {
	if(!oldPos) {
		console.log("No position", name, newPos);
		return;
	}
	
	var i = 0, p = players[oldPos], l = p.length,
		chunk = newPos.chunk,
		pos = newPos.pos;
	
	//loop over the chunk looking for the socket
	for(; i < l; ++i) {
		if(p[i].name == name) {
			p.splice(i, 1);
			break;
		}
	}
	
	//tell nearby users of the move
	broadcast(chunk[0], chunk[1], "playermove", {name: name, pos: newPos}, name);
	
	return this.add(chunk[0], chunk[1], name, pos, socket);
}

this.register = function(name) {
	if(name == "") return false;
	if(names[name]) return false;
	names[name] = true;
	
	return true;
}

this.remove = function(name) {
	var i, l, p, key, chunk, found = false;
	
	//loop everything
	for(key in players) {
		p = players[key];
		if(!p) continue;
		
		for(i = 0, l = p.length; i < l; ++i) {
			if(p[i].name === name) {
				p.splice(i, 1);
				found = true;
				break;
			}
		}
		
		if(found) break;
	}
	
	if(key) {
		chunk = key.split(",");
	
		//remove from names registry
		delete names[name];
	
		broadcast(chunk[0], chunk[1], "playerleave", name, name);
	}
}

function broadcast(chunkX, chunkY, event, msg, name) {
	var audience = [], i = 0, l;
	
	//broadcast to all users in surronding chunks
	audience = audience.concat(players[chunkX + "," + chunkY],
							   players[chunkX + "," + chunkY-1],
							   players[chunkX+1 + "," + chunkY-1],
							   players[chunkX+1 + "," + chunkY],
							   players[chunkX+1 + "," + chunkY+1],
							   players[chunkX + "," + chunkY+1],
							   players[chunkX-1 + "," + chunkY+1],
							   players[chunkX-1 + "," + chunkY],
							   players[chunkX-1 + "," + chunkY-1]);
	
	//loop over and broadcast to the sockets
	for(l = audience.length; i < l; ++i) {
		if(!audience[i]) continue;
		if(audience[i].name === name) continue;
		
		audience[i].socket.emit(event, msg);
	}
}