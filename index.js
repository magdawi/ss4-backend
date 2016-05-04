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
	{name: "Regenschirm", description: "Regenschirm halt", finish: null}
];

app.use(express.static('public'));

http.listen(port, function(){
  console.log(`webserver listening on *:${port}`);
});

io.on('connection', function(socket){
  socket.emit('chat message', 'Please Log In');
  let current_user = null;
  console.log('connected');

socket.on('login', function(user){
	if(current_user == null) {
		var exist = false;
		for (var i = 0; i < users.length; i++) {
			if(users[i].name == user || users[i].id == socket.id) exist = true;
		}
		if(!exist) {
			users.push({name: user, id: socket.id});
			current_user = {name: user, id: socket.id};
			socket.emit('chat message', `Login successful! Welcome '${user}'!`);
		}
		else {
			socket.emit('chat message', `Login denied!`);
		}
	}
	else {
		socket.emit('chat message', `You're already logged in!`);
	}
});

socket.on('logout', function(){
	if(current_user != null) {
		console.log(`logout ${socket.id}`);
		for (var i = 0; i < users.length; i++) {
			if (users[i].id == socket.id) {
				users.splice(i, 1);
			}
		}
		current_user = null;
		socket.emit('chat message', `Logout was successful!`);
	}
	else {
		socket.emit('chat message', `You're not logged in!`);
	}
});

socket.on('getAuctions', function(){
	console.log('getAuctions');
	for (var i = 0; i < auctions.length; i++) {
		socket.emit('chat message', `Auctions ID: ${i}; <br>Name: ${products[i].name}; <br>Description: ${products[i].description}; <br>Closetime: ${products[i].finish}`);		
	}
	
});

socket.on('bid', function(auc, val){
	if(current_user == null) {
		socket.emit('chat message', 'Log in to bid for an auction!');
		return;
	}

	if(auctions[auc] && !auctions[auc].finish) {
		auctions[auc].finish = new Date(new Date().getTime() + 60000);
		setTimeout(finishAuction, 60000, auc);
	}

	console.log(`bid ${auc} ${val}`);
	auc = parseInt(auc);
	val = parseInt(val);
	auctions[auc].push({id: socket.id, value: val});
	socket.emit('chat message', `Your bid on auction ${auc} was received with ${val} €.`);
	refresh(auc, socket);
});

socket.on('refresh', function(auc){
	if(current_user == null) {
		socket.emit('chat message', 'Log in to refresh auctions!');
		return;
	}
	
	refresh(auc, socket);
});

function finishAuction(auc) {

}


function refresh(a, socket) {
	const won = winner(a);
	if(won.id === socket.id) {
		socket.emit('chat message', `At the moment you have the best bid with ${won.value} €.`);
	}
	else{
		socket.emit('chat message', `You don't have the lowest single bid.`);
	}
}

function winner(a) {
	let amount = 1;
	const arr = auctions[a];
	arr.sort(compare);
	for(let i = 0; i < arr.length; i++) {
		if(arr[i+1] && arr[i].value == arr[i+1].value) {
			amount++;
		}
		else if(amount > 1) {
			amount = 1;
		}
		else {
			return arr[i];
		}
	}
	return {id: "error", value: "There is no winner"};
}

function compare(a, b) {
	return a.value - b.value;
}






socket.on('chat message', function(msg){
	io.emit('chat message', msg);
  });

  socket.on('disconnect', function(){
    console.log('disconnected');
  });
});

// export app so we can test it
exports = module.exports = app;



