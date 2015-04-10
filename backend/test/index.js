var app = require('express')();
var http = require('http').Server(app);

app.get('/', function(req, res){
  res.send('<h1>Hello Home</h1>');
});

app.get('/save', function(req, res){
  res.send('<h1>Hello Save</h1>');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});