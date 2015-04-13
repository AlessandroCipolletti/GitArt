var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongojs = require('mongojs');
/*
var db = mongojs("46.252.150.61/socialart", ["draws"]);

db.on('error', function(err) {
    console.log('database error', err);
});

db.on('ready', function() {
    console.log('database connected');
});
*/

io.on('connection', function(socket) {
  
	socket.on('editor save', function(data) {

		data = JSON.parse(data);
		var base64 = data.draw.data,
			minX = data.draw.coordX,
			minY = data.draw.coordY,
			w = data.draw.w,
			h = data.draw.h,
			maxX = minX + w,
			maxY = minY + h,
			x = data.x,
			y = data.y;
		
		// inserimento di un oggetto mongodb con tutte queste chiavi, e recuperare l'id o index
		
		socket.emit('editor save', JSON.stringify({
			ok: true,
			id: 1000
		}));
		
	});
	
	socket.on('dashboard drag', function(data) {
		
		data = JSON.parse(data);
		var minX = data.area.minX + 50;
			minY = data.area.minY + 50,
			maxX = data.area.maxX - 50,
			maxY = data.area.maxY - 50,
			x = data.area.x,
			y = data.area.y,
			ids = data.ids.join();
		
		// query di select e inviare un disegno alla volta al client
		
		var draw = {};
		
		socket.emit('dashboard drag', JSON.stringify(draw));
			
	});
	
});

http.listen(4000, function(){
  console.log('listening on *:4000');
});
