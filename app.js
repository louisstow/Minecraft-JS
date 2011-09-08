var app = require("http").createServer(handler),
	io = require("socket.io").listen(app),
	fs = require("fs"),
	path = require("path"),
	sprite = require("./spritemap"),
	world = require("./world"),
	player = require("./player");

app.listen(8056);

function handler(req, res) {
	var file = "." + req.url;
	if(file === "./") file = "./index.html";
	
	var extname = path.extname(file);
	var contentType;
	
	switch(extname) {
		case '.html':
		case '.htm':
			contentType = 'text/html';
			break;
		case '.js':
			contentType = 'text/javascript';
			break;
		case '.css':
			contentType = 'text/css';
			break;
		case '.png':
			contentType = 'image/png';
			break;
			
		//don't allow any other file types
		default:
			console.log(extname, file);
			res.writeHead(500);
			res.end();
			return;
	}
	
	path.exists(file, function(exists) {
		if(exists) {
			fs.readFile(file, function(err, data) {
				res.writeHead(200, {'Content-Type': contentType});
				res.end(data);
			});
		} else {
			console.log("404", "[" + file + "]");
			res.writeHead(404);
			res.end();
		}
	});
}

//on first connection, send map
io.sockets.on("connection", function(socket) {
	//user provides their name
	socket.on("name", function(data) {
		//check valid name
		if(!player.register(data)) {
			socket.emit("error");
			return;
		}
		
		socket.set("name", data);
		
		//sit them in the middle
		var key = player.add(0, 0, data, [8, 11], socket);
		
		socket.set("key", key);
		
		//once their name is provided, give them 0, 0
		socket.emit("generate", world.load(0, 0));
	});
	
	//on update position, emit
	socket.on("updatepos", function(data) {
		socket.get("key", function(err, key) {
			socket.get("name", function(err, name) {
				socket.set("key", player.updatePosition(key, name, data, socket));
			});
		});
	});
	
	//on update map
	socket.on("updatemap", function(data) {
		socket.get("name", function(err, name) {
			world.updateBlock(data.chunk, data);
			
			socket.broadcast.emit("blockchange", data);
		});
	});
	
	//user requests new chunk
	socket.on("newchunk", function(x, y) {
		socket.emit("newchunk", {key: (x + "," + y), data: world.load(x, y)});
	});
	
	socket.on("disconnect", function() {
		socket.get("name", function(err, name) {
			player.remove(name);
		});
	});
});