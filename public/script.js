var socket = io();

// LOGIN

$('#login').submit(function(){
  socket.emit('login', $('#username').val());
});

socket.on('login', function(name, bool){
    if (bool) {
      $('#login').addClass('hidden');
      $('#logout label').text(name);

      $('#logout').removeClass('hidden');
      $('#nav').removeClass('hidden');
      $('#content').removeClass('hidden');

      $('#auctions').empty();
    }

});

// LOGOUT

$('#logout').submit(function(){
  socket.emit('logout', username);
});

socket.on('logout', function(alert, bool){
  if (bool) {
    $('#login').removeClass('hidden');
    $('#logout label').text();

    $('#logout').addClass('hidden');
    $('#nav').addClass('hidden');
    $('#content').addClass('hidden');

    $('#auctions').empty();
  }
});

// GET AUCTIONS

$('#allBids').on('click', function(){
  $('#auctions').empty();
  $('#allBids').addClass('active');
  $('#myBids').removeClass('active');
  $('#myBill').addClass('hidden');
  socket.emit('getAuctions');
});

socket.on('getAuctions', function(id, thumbnail, name, description, finishtime){
  var closing;
  if (finishtime == false) closing = "Not started!";
  else if (finishtime == true) closing = "Closed !";
  else closing = finishtime;

  var form = "";
  if (finishtime != true) {
    form = `<form data-form-id="${id}" action="">
              <input type="number" step="0.01" min="0"/>
              <input type="hidden" value="${id}"/>
              <button class="btn btn-primary bid-button">send bid</button>
            </form>`;
  }

  $('#auctions').append(` <li>
                            <img src="${thumbnail}">
                            <h5 data-time-id="${id}">### ${closing} ###</h5>
                            <h2>${name}</h2>
                            <p>${description}</p>
                            ${form}
                          </li>`);
});

// BID

$('#auctions').on('click', '.bid-button', function(){
  var val = $(this)[0].parentElement[0].value;
  var auc = $(this)[0].parentElement[1].value;

  var regex = new RegExp('([0-9]+([.][0-9]{1,2})?)');

  if (regex.test(val)) {
    socket.emit('bid', auc, val);
  }
});

// SHOW MY BIDS
$('#myBids').on('click', function(){
  $('#auctions').empty();
  $('#myBids').addClass('active');
  $('#allBids').removeClass('active');
  $('#myBill').removeClass('hidden');
  socket.emit('myBids');
});

socket.on('myBids', function(id, name, description, thumbnail, finishtime, color, sum){
  var closing;
  if (finishtime == false) closing = "Not started!";
  else if (finishtime == true) closing = "Closed !";
  else closing = finishtime;

  $('#auctions').append(`<li>
                            <img src="${thumbnail}">
                            <h5 data-time-id="${id}">### ${closing} ###</h5>
                            <h2>${name} <span class="point ${color}" data-point-id="${id}"></span></h2>
                            <p>${description}</p>
                            <h4><strong>Total sum:</strong> ${sum}</h4>
                          </li>`);
});

socket.on('refreshMyBidsPoints', function(id, color){
  $(`span[data-point-id="${id}"]`).removeClass("red green grey");
  $(`span[data-point-id="${id}"]`).addClass(`${color}`);
});

socket.on('refreshTimeOfAuc', function(id, text){
  $(`h5[data-time-id="${id}"]`).html(text);
  if(text == '### Closed ! ###') {
    $(`form[data-form-id="${id}"]`).html('');
  }
});


// SOCKET ON DISCONNECT

socket.on('disconnect', function(){
  $('#login').removeClass('hidden');
  $('#logout label').text();

  $('#logout').addClass('hidden');
  $('#nav').addClass('hidden');
  $('#content').addClass('hidden');
});

// MESSAGE

socket.on('message', function(msg, alert){
  $('#info').show();
  $('#info').removeClass('hidden alert-success alert-info alert-warning alert-danger');
  $('#info').addClass(alert);
  $('#info').html(msg);
  $('#info').delay(5000).fadeOut(1000);
});

$('form').submit(function(){
  return false;
});
