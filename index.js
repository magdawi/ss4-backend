'use strict'

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;
const users = [];
const auctions = [
	[{id: "1", value: 5}, {id: "2", value: 2}, {id: "3", value: 2}]
];
const products = [
	{name: "Regenschirm", description: "Regenschirm halt", finish: "timestamp+1min"}
];

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

socket.on('logout', function(){
	console.log(`logout ${socket.id}`);
});

socket.on('getAuctions', function(){
	console.log('getAuctions');
	for (var i = 0; i < auctions.length; i++) {
		socket.emit('chat message', `Auctions ID: ${i}; Name: ${products[i].name}; Description: ${products[i].description}; Closetime: ${products[i].finish}`);		
	}
	
});

socket.on('bid', function(auc, val){
	console.log(`bid ${auc} ${val}`);
	auc = parseInt(auc);
	val = parseInt(val);
	auctions[auc].push({id: socket.id, value: val});
	socket.emit('chat message', `Your bid on auction ${auc} was received with ${val}€.`);
});

socket.on('refresh', function(auc){
	console.log(`refresh ${auc}`);
	const won = winner(auc);
	console.log(won);
	if(won.id === socket.id) {
		socket.emit('chat message', `At the moment you have the best bid with ${won.value}.`);
	}
	else{
		socket.emit('chat message', `You don't have the lowest single bid.`);
	}
});

function winner(a) {
	let start = 0;
	let amount = 1;
	const arr = auctions[a];
	arr.sort(compare);
	for(let i = 0; i < arr.length; i++) {
		if(arr[i+1] && arr[i].value == arr[i+1].value) {
			amount++;
		}
		else if(amount > 1) {
			const deleted = arr.splice(start, amount);
			console.log(deleted);
			i = start;
			amount = 1;
		}
		else {
			start = i+1;
		}
	}
	return arr[0];
}

function compare(a, b) {
	return a.value - b.value;
}






socket.on('chat message', function(msg){
	io.emit('chat message', msg);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

// export app so we can test it
exports = module.exports = app;



