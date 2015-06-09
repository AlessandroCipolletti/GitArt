var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;


var db = mongojs("localhost/dev", ["draws"]);

db.on('error', function(err) {
    console.log('database error', err);
});

db.on('ready', function() {
    console.log('database connected');
});

io.on('connection', function(socket) {
	
	socket.emittedDraws = [];
	socket.on('editor save', function(data) {
		var draw = JSON.parse(data);
		console.log(draw);
		var a = db.draws.insert(draw, function(err, item) {
			socket.emit('editor save', JSON.stringify({
				ok: true,
				id: item._id
			}));
		});
	});
	
	socket.on('dashboard drag', function(data) {
		data = JSON.parse(data);
		var _ids = data.ids,
			ids = [];
		
		for (var i = _ids.length; i--; ) {
			_ids[i].length && ids.push(ObjectId(_ids[i]));
		}
		ids = ids.concat(socket.emittedDraws);
		
		db.draws.find({
			_id		: { $nin : ids },
			x		: { $lt : data.area.maxX },
			y		: { $lt : data.area.maxY },
			r		: { $gt : data.area.minX },
			b		: { $gt : data.area.minY }
		}, {}, {limit: 100}, function(err, draws) {
			if (err || !draws) {
				console.log("query error: ", err);
				socket.emit('dashboard drag', "error");
			} else if (draws.length === 0) {
				//console.log("0 rows found");
				socket.emit('dashboard drag', "none");
			} else {
				console.log(draws.length + " rows found");
				draws.forEach(function(draw) {
					(socket.emittedDraws.indexOf(draw._id) < 0) && socket.emittedDraws.push(draw._id);
					var ris = {
						id		: draw._id,
						base64	: draw.base64,
						w		: draw.w,
						h		: draw.h,
						x		: draw.x,
						y		: draw.y,
						r		: draw.r,
						b		: draw.b
					};
					console.log([ris.x, ris.y]);
					socket.emit('dashboard drag', JSON.stringify([ris]));
					draw = undefined;
				});
				console.log("\n");
				socket.emit('dashboard drag', "end");
			}
		});	
	});
	
});



http.listen(5000, function(){
  console.log('listening DEV on *:5000\n');
});
