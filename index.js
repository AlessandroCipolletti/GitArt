var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;

var db = mongojs("localhost/socialart", ["draws"]);

db.on('error', function(err) {
    console.log('database error', err);
});

db.on('ready', function() {
    console.log('database connected');
});

/*
	// TEST
	var ids = [, "552c5551148d64da0837719a"];
	for (var i = ids.length; i--; ) {
		ids[i] = ObjectId(ids[i]);
	}
	db.draws.find({
		_id : { $nin: ids},
	}, function(err, draws) {
		if (err || !draws) {
			console.log("query error: ", err);
		} else if (draws.length === 0) {
			console.log("0 rows found");
		} else {
			draws.forEach(function(draw) {
				console.log(draw._id);
			});
		}
	});
*/


io.on('connection', function(socket) {
  
	socket.on('editor save', function(data) {

		data = JSON.parse(data);
		var minX = data.draw.coordX,
			minY = data.draw.coordY,
			w = data.draw.w,
			h = data.draw.h,
			draw = {
				base64: data.draw.data,
				minX: minX,
				minY: minY,
				w: w,
				h: h,
				maxX: minX + w,
				maxY: minY + h,
				x: data.x,
				y: data.y
			};
		
		var a = db.draws.insert(draw, function(err, item) {
			
			socket.emit('editor save', JSON.stringify({
				ok: true,
				id: item._id
			}));
			
		});

	});
	
	socket.on('dashboard drag', function(data) {
		
		data = JSON.parse(data);
		var areaMinX = data.area.minX + 50,
			areaMinY = data.area.minY + 50,
			areaMaxX = data.area.maxX - 50,
			areaMaxY = data.area.maxY - 50,
			x = data.area.x,
			y = data.area.y,
			_ids = data.ids,
			ids = [];
		
		for (var i = _ids.length; i--; ) {
			_ids[i].length && ids.push(ObjectId(_ids[i]));
		}

		db.draws.find({
			_id		: { $nin : ids },
			maxX	: { $gt : areaMinX },
			maxY	: { $gt : areaMinY },
			minX	: { $lt : areaMaxX },
			minY	: { $lt : areaMaxY }
		}, {}, {limit: 100}, function(err, draws) {
			
			if (err || !draws) {
				console.log("query error: ", err);
			} else if (draws.length === 0) {
				console.log("0 rows found");
			} else {
				console.log(draws.length + " rows found");
				draws.forEach(function(draw) {
					var ris = {
						id		: draw._id,
						data	: draw.base64,
						w		: draw.w,
						h		: draw.h,
						x		: draw.minX,
						y		: draw.minY
					};
					socket.emit('dashboard drag', JSON.stringify([ris]));
					draw = undefined;
				});
			}
		
		});
			
	});
	
});



http.listen(4000, function(){
  console.log('listening on *:4000');
});

