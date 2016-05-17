var socket = io();

// LOGIN

$('#login').submit(function(){
  socket.emit('login', $('#username').val());
});

socket.on('login', function(name, alert, bool){
    $('#info').removeClass('alert-success alert-info alert-warning alert-danger');
    $('#info').addClass(alert);

    if (bool) {
      $('#login').addClass('hidden');
      $('#logout label').text(name);

      $('#logout').removeClass('hidden');
      $('#nav').removeClass('hidden');
      $('#content').removeClass('hidden');
    }

});

// LOGOUT

$('#logout').submit(function(){
  socket.emit('logout', username);
});

socket.on('logout', function(alert, bool){
  $('#info').removeClass('alert-success alert-info alert-warning alert-danger');
  $('#info').addClass(alert);

  if (bool) {
    $('#login').removeClass('hidden');
    $('#logout label').text();

    $('#logout').addClass('hidden');
    $('#nav').addClass('hidden');
    $('#content').addClass('hidden');
  }
});

// GET AUCTIONS

$('#allBids').on('click', function(){
  $('#auctions').empty();
  $('#allBids').addClass('active');
  $('#myBids').removeClass('active');
  socket.emit('getAuctions');
});

socket.on('getAuctions', function(id, thumbnail, name, description, finishtime){
  var closing;
  if (finishtime == false) closing = "Auction not started yet !";
  else if (finishtime == true) closing = "Auction closed !";
  else closing = finishtime;

  var form = "";
  if (finishtime != true) {
    form = `<form action="">
              <input type="number" step="0.01" min="0" name="bid"/>
              <button class="btn btn-primary">send bid</button>
            </form>`;
  }

  $('#auctions').append(` <li>
                            <img src="${thumbnail}">
                            <h5>### ${closing} ###</h5>
                            <h2>${name}</h2>
                            <p>${description}</p>
                            ${form}
                          </li>`);
});

// BID

function newBid(auc, val) {
  console.log(auc, val);
  //socket.emit('bid', auc, val);
}

// SHOW MY BIDS
$('#myBids').on('click', function(){
  $('#auctions').empty();
  $('#myBids').addClass('active');
  $('#allBids').removeClass('active');
  socket.emit('myBids');
});

socket.on('myBids', function(id, name, description, thumbnail, finishtime){
  var closing;
  if (finishtime == false) closing = "Auction not started yet !";
  else if (finishtime == true) closing = "Auction closed !";
  else closing = finishtime;

  $('#auctions').append(`<li>
                            <img src="${thumbnail}">
                            <h5>### ${closing} ###</h5>
                            <h2>${name}</h2>
                            <p>${description}</p>
                          </li>`);
});

socket.on('message', function(msg){
   $('#info').html(msg);
   $('#info').removeClass('hidden');
});






$('form').submit(function(){
  //login Marta   -> Access denied / Access successful
  //logout    -> successful / not successful
  //getAuctions    -> list of running auctions
  //bid 10 5   -> successful / not successful
  //refresh 10   -> best bid / not
  var args = $('#m').val().split(" ");
  switch(args[0]) {
    //case 'login': socket.emit('login', args[1]); $('#username').text(`${args[1]}`); break;
    //case 'logout': socket.emit('logout'); break;
    //case 'getAuctions': socket.emit('getAuctions'); break;
    case 'bid': socket.emit('bid', args[1], args[2]); break;
    //case 'refresh': socket.emit('refresh', args[1]); break;
    default:
        $('#messages').append($('<li>').text("Input failed"));
  }
  $('#m').val('');

  //socket.emit('chat message', $('#m').val());
  $('#m').val('');
  return false;
});
