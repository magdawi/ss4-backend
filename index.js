'use strict'

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5000;
const auctionLength = 50000;
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
	if(socket.connected){
  		socket.emit('message', 'Login to use AuctionCenter !', 'alert-info');
  	}
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
				if(socket.connected){
					socket.emit('message', `Login successful !`, 'alert-success');
					socket.emit('login', `${user}`);
				}
			}
			else {
				if(socket.connected){
					socket.emit('message', `Login denied !`, 'alert-danger');
				}
			}
		}
		else {
			if(socket.connected){
				socket.emit('message', `You're already logged in !`, 'alert-warning');
			}
		}
	});

	//LOGOUT

	socket.on('logout', function(username){
		var runningbids = false;

		for (var i = 0; i < auctions.length; i++) {
			var arr = auctions[i];
			for (var j = 0; j < arr.length; j++) {
				if (arr[j].id == socket.id && products[i].finish != true) runningbids = true;
			}
		}

		if(current_user != null && runningbids == false) {
			for (var i = 0; i < users.length; i++) {
				if (users[i].id == socket.id && users[i].name == username) {
					users.splice(i, 1);
				}
			}
			current_user = null;
			if(socket.connected){
				socket.emit('message', `Logout was successful !`, 'alert-success');
				socket.emit('logout');
			}
		}
		else if (current_user != null && runningbids == true) {
			if(socket.connected){
				socket.emit('message', `Your auctions are not finished !`, 'alert-warning');
			}
		}
		else {
			if(socket.connected){
				socket.emit('message', `You're not logged in !`, 'alert-danger');
			}
		}
	});

	// GET ALL AUCTIONS

	socket.on('getAuctions', function(){
		for (var i = 0; i < products.length; i++) {
			var finishtime = products[i].finish;
			if (finishtime != true && finishtime != false) finishtime = products[i].finish.toLocaleString();
			if(socket.connected){
				socket.emit('getAuctions', i, products[i].thumbnail, products[i].name, products[i].description, finishtime);		
			}
		}
	});

	// BID

	socket.on('bid', function(auc, val){
		if(current_user == null && socket.connected) {
			socket.emit('message', 'Login in to bid !', 'alert-warning');
			return;
		}
		auc = parseInt(auc);
		val = parseFloat(val);
		val = parseFloat(val.toFixed(2));


		if(val <= 0) {
			if(socket.connected){
				socket.emit('message', 'Your bid has to be more than 0€ !', 'alert-warning');
			}
			return;
		}

		//check if auction already has finished
		if(products[auc].finish === true) {
			if(socket.connected){
				socket.emit('message', 'This auction has already finished', 'alert-warning');
			}
			return;
		}

		//first bid, start auction
		if(products[auc] && !products[auc].finish) {
			products[auc].finish = new Date(new Date().getTime() + auctionLength);
			setTimeout(finishAuction, auctionLength, auc);
			var closing  = products[auc].finish.toLocaleString();
			io.sockets.emit('refreshTimeOfAuc', auc, `### ${closing} ###`);
		}
		
		//first bid, create array
		if (auctions[auc] == undefined) auctions[auc] = [];

		var actualwinner = winner(auc);
		auctions[auc].push({id: socket.id, value: val});
		if(socket.connected){
			socket.emit('message', `You bid ${val}€.`, 'alert-success');
		}
		refresh(auc, actualwinner);
	});

	// MY BIDS

	socket.on('myBids', function(){
		if(current_user == null) {
			return;
		}
		var auction, bid, count = 0;
		var color = 'grey';
		var win, sum;

		for (var i = 0; i < auctions.length; i++) {
			if (auctions[i] != undefined && auctions[i] != []) {
				auction = auctions[i];
				win = winner(i);

				if (win.id == socket.id) color = 'green';
				else color = 'red';

				for(var j = 0; j < auction.length; j++) {
					bid = auction[j];
					if(bid.id == socket.id && count < 1) {
						sum = getSum(socket.id, auction);
						var finishtime = products[i].finish;
						if (finishtime != true && finishtime != false) finishtime = products[i].finish.toLocaleString();
						if(socket.connected){
							socket.emit('myBids', i, products[i].name, products[i].description, products[i].thumbnail, finishtime, color, sum);
						}
						count++;
					}
				}
				count = 0;
			}
		}
	});

	// ADDITIONAL FUNCTIONS

	function finishAuction(auc) {
		const won = winner(auc);
		let bids = auctions[auc];
		let users = [];
		for(let b of bids) {
			if (users[b.id] == undefined) {
				users[b.id] = b.id;
			}
		}

		for(var u in users) {
			if (io.sockets.connected[u]) {
				if(users[u] !== won.id) {
					io.sockets.connected[u].emit('message', 'Auction finished. You have not won.', 'alert-warning');
				} else {
					io.sockets.connected[u].emit('message', 'Congratulations! You won an auction!', 'alert-success');
				} 
			}
		}
		io.sockets.emit('refreshTimeOfAuc', auc, "### Closed ! ###");
		products[auc].finish = true;
	}


	function refresh(a, actualwinner) {
		const won = winner(a);
		var finishtime;

		if (won.id === socket.id) {
			if(socket.connected){
				socket.emit('refreshMyBidsPoints', a, 'green');
			}			
			if(actualwinner.id != 0 && io.sockets.connected[actualwinner.id]) {
				io.sockets.connected[actualwinner.id].emit('message', `You don't have the lowest single bid anymore. (auction ${a})`, 'alert-warning');
				io.sockets.connected[actualwinner.id].emit('refreshMyBidsPoints', a, 'red');
			}
		}
		else if (won.id == 0) {
			if(socket.connected){
				socket.emit('refreshMyBidsPoints', a, 'red');
			}

			if(actualwinner.id != 0 && io.sockets.connected[actualwinner.id]) {
				io.sockets.connected[actualwinner.id].emit('message', `You don't have the lowest single bid anymore. (auction ${a})`, 'alert-warning');
				io.sockets.connected[actualwinner.id].emit('refreshMyBidsPoints', a, 'red');
			}
		}
		else {
			socket.emit('refreshMyBidsPoints', a, 'red');
			if (actualwinner.id !== won.id && io.sockets.connected[won.id]) {
				io.sockets.connected[won.id].emit('message', `You have now the lowest single bid!! (auction ${a})`, 'alert-success');
				io.sockets.connected[won.id].emit('refreshMyBidsPoints', a, 'green');
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

	function getSum(id, auc) {
		var sum = 0;
		for (var i = 0; i < auc.length; i++) {
			if (auc[i].id == id) {
				sum += auc[i].value;
			}
		}
		return sum;
	}

	socket.on('disconnect', function(){
	console.log('disconnected');
	for (var i = 0; i < users.length; i++) {
			if (users[i].id == socket.id) {
				users.splice(i, 1);
			}
		}
	current_user = null;
	});
});

// export app so we can test it
exports = module.exports = app;



