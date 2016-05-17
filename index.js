'use strict'

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;
const auctionLength = 100000;
const users = [];
const auctions = [];
const products = [
	{name: "Regenschirm", description: "Wunderschöner blauer Regenschirm mit lila Punkten, grünen Strichen und kleinen pinken Feen.", thumbnail: "http://racerboxes.com/wp-content/uploads/photo-gallery/thumb/sc-3.jpg", finish: false},
	{name: "Stiefel", description: "Feinste Lederstiefeln aus purpurroten Kalbsleder", thumbnail: "http://racerboxes.com/wp-content/uploads/photo-gallery/thumb/sc-3.jpg", finish: false},
	{name: "Cupcake", description: "This is a perfectly formed and delicious chocolate cupcake with topping. (ABCDE)", thumbnail: "http://bit.ly/23N0ho4", finish: false}
];

app.use(express.static('public'));

http.listen(port, function(){
  console.log(`webserver listening on *:${port}`);
});

io.on('connection', function(socket){
  socket.emit('message', 'Login to use AuctionCenter !');
  let current_user = null;
  console.log('connected');


// LOGIN

socket.on('login', function(user){
	if(current_user == null) {
		var exist = false;
		if (user == "") exist = true;
		else {
			for (var i = 0; i < users.length; i++) {
				if(users[i].name == user || users[i].id == socket.id) exist = true;
			}
		}
		if(!exist) {
			users.push({name: user, id: socket.id});
			current_user = {name: user, id: socket.id};
			socket.emit('message', `Login successful !`);
			socket.emit('login', `${user}`, 'alert-success', true);
		}
		else {
			socket.emit('message', `Login denied !`);
			socket.emit('login', `${user}`, 'alert-danger', false);
		}
	}
	else {
		socket.emit('message', `You're already logged in !`);
		socket.emit('login', `${user}`, 'alert-danger', false);
	}
});

//LOGOUT

socket.on('logout', function(){
	var runningbids = false;

	for (var i = 0; i < auctions.length; i++) {
		var arr = auctions[i];
		for (var j = 0; j < arr.length; j++) {
			if (arr[j].id == socket.id && products[i].finish != true) runningbids = true;
		}
	}

	if(current_user != null && runningbids == false) {
		console.log(`logout ${socket.id}`);
		for (var i = 0; i < users.length; i++) {
			if (users[i].id == socket.id) {
				users.splice(i, 1);
			}
		}
		current_user = null;
		socket.emit('message', `Logout was successful !`);
		socket.emit('logout', 'alert-success', true);
	}
	else if (current_user != null && runningbids == true) {
		socket.emit('message', `Auctions you have bidden on are not finished !`);
		socket.emit('logout', 'alert-warning', false);
	}
	else {
		socket.emit('message', `You're not logged in !`);
		socket.emit('logout', 'alert-warning', false);
	}
});

// GET ALL AUCTIONS

socket.on('getAuctions', function(){
	console.log('getAuctions');
	for (var i = 0; i < products.length; i++) {
		var finishtime = products[i].finish;
		if (finishtime != true && finishtime != false) finishtime = products[i].finish.toLocaleString();
		socket.emit('getAuctions', i, products[i].thumbnail, products[i].name, products[i].description, finishtime);		
	}
	
});

// BID

socket.on('bid', function(auc, val){
	if(current_user == null) {
		socket.emit('message', 'Log in to bid for an auction!');
		return;
	}

	console.log(`bid ${auc} ${val}`);
	auc = parseInt(auc);
	val = parseFloat(val);
	val = parseFloat(val.toFixed(2));


	if(val <= 0) {
		socket.emit('message', 'You have to bid with a real value');
		return;
	}

	//check if auction already has finished
	if(products[auc].finish === true) {
		socket.emit('message', 'This auction has already finished');
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
	socket.emit('message', `Your bid on auction ${auc} was received with ${val} €.`);
	refresh(auc, actualwinner);
});

// MY BIDS

socket.on('myBids', function(){
	if(current_user == null) {
		socket.emit('message', 'Log in to see your auctions!');
		return;
	}
	var auction, bid, count = 0;

	for (var i = 0; i < auctions.length; i++) {
		auction = auctions[i];
		for(var j = 0; j < auction.length; j++) {
			bid = auction[j];
			if(bid.id == socket.id && count < 1) {
				var finishtime = products[i].finish;
				if (finishtime != true && finishtime != false) finishtime = products[i].finish.toLocaleString();
				socket.emit('myBids', i, products[i].name, products[i].description, products[i].thumbnail, finishtime);
				count++;
			}
		}
		count = 0;
	}
});

// ADDITIONAL FUNCTIONS

function finishAuction(auc) {
	console.log('The following Auction has finished: ', auc)
	const won = winner(auc);
	let users = {};
	for(let auction of auctions[auc]) {
		if(users[auction.id] === undefined) users[auction.id] = {sum: 0, bids: [], id: auction.id};
		const user = users[auction.id];
		user.sum += auction.value;
		user.bids.push(auction.value);
	}
	for(let user in users) {
		user = users[user]
		if (io.sockets.connected[user.id]) {
			if(user.id !== won.id) {
				io.sockets.connected[user.id].emit('message', 'Auction finished. You have not won.');
				io.sockets.connected[user.id].emit('message', `You're biddings: ${user.bids.join(";")}`);
				io.sockets.connected[user.id].emit('message', `Total spending: ${user.sum}`);
			} else {
				io.sockets.connected[user.id].emit('message', 'Congratulations! You won an auction!');
				io.sockets.connected[user.id].emit('message', `You're biddings: ${user.bids.join(";")}`);
				io.sockets.connected[user.id].emit('message', `Total spending: ${user.sum}`);
			} 
		}
	}
	products[auc].finish = true;
}


function refresh(a, actualwinner) {
	const won = winner(a);

	if (won.id === socket.id) {
		socket.emit('message', `At the moment you have the best bid with ${won.value} €.`);
		if(actualwinner.id != 0) io.sockets.connected[actualwinner.id].emit('chat message', `You don't have the lowest single bid anymore. (auction ${a})`);
	}
	else if (won.id == 0) {
		socket.emit('message', `You don't have the lowest single bid.`);
		if(actualwinner.id != 0) io.sockets.connected[actualwinner.id].emit('chat message', `You don't have the lowest single bid anymore. (auction ${a})`);
	}
	else {
		socket.emit('message', `You don't have the lowest single bid.`);
		if (actualwinner.id !== won.id) {
			io.sockets.connected[won.id].emit('message', `You have now the lowest single bid!!	 (auction ${a})`);
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
	return {id: "0", value: "There is no winner"};
}

function compare(a, b) {
	return a.value - b.value;
}






socket.on('message', function(msg){
	io.emit('message', msg);
  });

  socket.on('disconnect', function(){
    console.log('disconnected');
  });
});

// export app so we can test it
exports = module.exports = app;



