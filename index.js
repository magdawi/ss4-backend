const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;
const users = [];

app.use(express.static('public'));

http.listen(port, function(){
  console.log(`webserver listening on *:${port}`);
});

io.on('connection', function(socket){
  socket.emit('chat message', 'Please Log In');
  console.log('a user connected');

socket.on('login', function(user){
	var exist = false;
	for (var i = 0; i < users.length; i++) {
		if(users[i].name == user) exist = true;
	}
	if(!exist) {
		users.push({name: user, id: socket.id});
		socket.emit('chat message', `Login successful! Welcome '${user}'!`);
	}
	else {
		socket.emit('chat message', `Login denied! Name '${user}' is already taken! Try again!`);
	}
  });




socket.on('chat message', function(msg){
	io.emit('chat message', msg);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

// export app so we can test it
exports = module.exports = app;



