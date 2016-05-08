'use strict'

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;
const auctionLength = 60000;
const users = [];
const auctions = [];
const products = [
	{name: "Regenschirm", description: "Regenschirm halt", finish: false},
	{name: "Stiefel", description: "Feinste Lederstiefeln aus purpurroten Kalbsleder", finish: false}
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
	console.log('getAuctions was called');
	for (let i = 0; i < products.length; i++) {
		if(products[i].finish !== true)
		socket.emit('chat message', `Auctions ID: ${i}; <br>Name: ${products[i].name}; <br>Description: ${products[i].description}; <br>Closetime: ${products[i].finish}`);		
	}
	
});

socket.on('bid', function(auc, val){
	if(current_user == null) {
		socket.emit('chat message', 'Log in to bid for an auction!');
		return;
	}

	console.log(`bid ${auc} ${val}`);
	auc = parseInt(auc);
	val = parseInt(val);

	if(isNaN(auc) || isNaN(val)) {
		socket.emit('chat message', 'Wrong Syntax bid <auction> <value>');
		return;
	}

	//check if auction already has finished
	if(products[auc].finish === true) {
		socket.emit('chat message', 'This auction has already finished');
		return;
	}

	//first bid, start auction
	if(products[auc] && !products[auc].finish) {
		products[auc].finish = new Date(new Date().getTime() + auctionLength);
		console.log("The following auction has started", auc)
		setTimeout(finishAuction, auctionLength, auc);
	}
	
	//first bid, create array
	if (auctions[auc] == undefined) auctions[auc] = [];

	var actualwinner = winner(auc);
	auctions[auc].push({id: socket.id, value: val});
	socket.emit('chat message', `Your bid on auction ${auc} was received with ${val} €.`);
	refresh(auc, actualwinner);
	console.log(auctions);
});

socket.on('refresh', function(auc){
	if(current_user == null) {
		socket.emit('chat message', 'Log in to refresh auctions!');
		return;
	}
	
	refresh(auc, socket);
});

function finishAuction(auc) {
	console.log('The following Auction has finished: ', auc)
	const won = winner(auc);
	for(let user of auctions[auc]) {
		const socketid = user.id

		if (io.sockets.connected[socketid] && socketid !== won.id) {
		    io.sockets.connected[socketid].emit('chat message', 'You have not won');
		}
		if(io.sockets.connected[socketid] && socketid === won.id) {
			io.sockets.connected[socketid].emit('chat message', 'You won');
		}
	}

	products[auc].finish = true;
}


function refresh(a, actualwinner) {
	const won = winner(a);

	//ich bin neuer gewinner
	if (won.id === socket.id) {
		socket.emit('chat message', `At the moment you have the best bid with ${won.value} €.`);
		if(actualwinner.id != 'error') io.sockets.connected[actualwinner.id].emit('chat message', `You don't have the lowest single bid anymore. (auction ${a})`);
	}
	//biete daneben
	else{
		socket.emit('chat message', `You don't have the lowest single bid.`);
		if (actualwinner.id !== won.id) {
			console.log("winner", won.id);
			io.sockets.connected[won.id].emit('chat message', `You have now the lowest single bid!!	 (auction ${a})`);
		}
	}
}

function winner(a) {
	let amount = 1;
	const arr = auctions[a];

	if (arr.length > 1)	arr.sort(compare);
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



