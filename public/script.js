var socket = io();

$('form').submit(function(){
  //login Marta   -> Access denied / Access successful
  //logout    -> successful / not successful
  //getAuctions    -> list of running auctions
  //bid 10 5   -> successful / not successful
  //refresh 10   -> best bid / not
  var args = $('#m').val().split(" ");
  switch(args[0]) {
    case 'login': socket.emit('login', args[1]); $('#username').text(`${args[1]}`); break;
    case 'logout': socket.emit('logout'); break;
    case 'getAuctions': socket.emit('getAuctions'); break;
    case 'bid': socket.emit('bid', args[1], args[2]); break;
    case 'refresh': socket.emit('refresh', args[1]); break;
    default:
        $('#messages').append($('<li>').text("Input failed"));
  }
  $('#m').val('');

  //socket.emit('chat message', $('#m').val());
  $('#m').val('');
  return false;
});

socket.on('chat message', function(msg){
   $('#messages').append($('<li>').html(msg));
});