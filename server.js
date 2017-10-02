const express = require('express');

const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(__dirname + '/public'));

let players = [];

io.on('connection', function(socket) {
  console.log('new connection from ' + socket.id);
  let player = socket.handshake.query;
  console.log(`welcome ${player.name}!`);
  // console.log(player);
  players.push({
    id: socket.id,
    name: player.name,
    hand: [],
  });
  console.log(players);
  
  socket.on('deal', function(player) {
    console.log(player.id, player.hand, player.total);
  });

  socket.on('disconnect', function() {
    players.forEach((player, index) => {
      console.log(`${player.name} disconnected!`);
      if (socket.id === player.id) {
        players.splice(index, 1);
      }
    });
  });
});

const port = process.env.PORT || 4000;

server.listen(port, function() {
  console.log(`You're tuned in to port ${port}!`);
});