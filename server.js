const express = require('express');
// const logger = require('morgan');
// const path = require('path');
// const cookieParser = require('cookie-parser');

const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

// app.use(logger('dev'));
app.use(express.static(__dirname + '/public'));

//// SERVER-SIDE GAME LOGIC
// Object prototype for creating Card objects.
var Card = function(suit,value,realValue) {
  this.suit = suit;
  this.value = value;
  this.realValue = realValue;
  this.img = `../images/Playing-Cards/${value}_of_${suit}.png`;
};
let deck = [];
deck = shuffleDeck();

// CREATES 52 CARD OBJECTS USING OBJECT CONSTRUCTOR
function createDeck() {
  let suits = ['spades', 'clubs', 'hearts', 'diamonds'];
  let values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  let realValues = [1,2,3,4,5,6,7,8,9,10,10,10,10]

  suits.forEach((suit) => {
    values.forEach((value, index) => {
      let card = new Card(suit, value, realValues[index]);
      deck.push(card);
    });
  });

};

// SHUFFLES CARD DECK AFTER CREATING THEM
function shuffleDeck() {
  console.log('shuffling deck...')

  createDeck();

  let deckSize = deck.length;
  let shuffleDeck = [];
  let randIndex;

  for(let i = 0; i < deckSize; i++) {
    randIndex = Math.floor(Math.random() * deck.length);
    shuffleDeck.push(deck.splice(randIndex, 1)[0]);
  };

  return shuffleDeck;
};

function dealCards() {
  players.forEach((player) => {
    player.hand.push(deck.shift());
    player.hand.push(deck.shift());
    player.total = calculateHand(player.hand);
    player = checkForAce(player);
    console.log(player);
  });
  dealer.hand.push(deck.shift());
  dealer.hand.push(deck.shift());
  dealer.total = calculateHand(dealer.hand);
  dealer = checkForAce(dealer);
  console.log(dealer);
}

function calculateHand(hand) {
  return hand.reduce((total, card) => {
    return total += card.realValue;
  }, 0);
}

function checkForAce(player) {
  if (hasAce(player.hand) && (player.total + 10 <= 21)) {
    player.total += 10
  }

  return player;
}

function hasAce(hand) {
  let hasAce = false;

  hand.forEach((card) => {
    if (card.value === 'A') {
      hasAce = true;
    }
  });

  return hasAce;
}

function dealerTurn() {
  let timeout = 0;
  while (dealer.total < 17) {
    let newCard = deck.shift();
    dealer.hand.push(newCard);
    setTimeout(function() {
      io.sockets.emit('new dealer card', {card: newCard});
    }, timeout);
    dealer.total = calculateHand(dealer.hand);
    dealer = checkForAce(dealer);
    timeout += 250;
  }

  setTimeout(function() {
    checkWinConditions();
  }, timeout);

  console.log(dealer);
}

function checkWinConditions() {
  players.forEach((player) => {
    if (player.total > 21) {
      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img,
        dealerTotal: dealer.total,
        status: 'lose',
        message: 'BUSTED!',
      });
    } else if (dealer.total > 21 && player.total < 21) {
      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img, 
        dealerTotal: dealer.total,
        status: 'win',
        message: `Dealer busts! YOU WIN $${player.bet}!`,
      });
    } else if (dealer.total === player.total) {
      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img, 
        dealerTotal: dealer.total,
        status: 'push', 
        message: 'PUSH!',
      });
    } else if (player.total > dealer.total) {
      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img, 
        dealerTotal: dealer.total,
        status: 'win',
        message: `YOU WIN $${player.bet}!`,
      });
    } else if (dealer.total > player.total) {
      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img, 
        dealerTotal: dealer.total,
        status: 'lose',
        message: `Dealer wins.`,
      });
    }
  })
}

////SOCKET.IO FUNCTIONALITY
let players = [];
let users = [];
let dealer = {hand: [], total: 0};
let playerTurn = 0;

io.on('connection', function(socket) {
  console.log('new connection from ' + socket.id);
  let user = socket.handshake.query;
  console.log(`welcome ${user.name}!`);
  
  // THIS WILL EVENTUALLY BE PUT IN A SOCKET.ON WHEN USER SETS THEIR NAME
  users.push({
    id: socket.id,
    name: user.name,
  });

  socket.emit('welcome', {users: users, players: players, greeting: `Welcome, ${user.name}`});
  socket.broadcast.emit('new user', `${user.name} has joined`);

  console.log(users);
  if (players.length < 5) {
    socket.emit('sit invite');
  }

  socket.on('deal me in', function(data) {
    players.push({
      id: socket.id,
      name: data.name,
      hand: [],
      bet: 0,
    });
    console.log(players);
    io.sockets.emit('new player', {players: players});
    socket.emit('request bet', {players: players});
  })

  socket.on('place bet', function(data) {
    let betCount = 0;
    players.forEach((player) => {
      if (player.id === socket.id) {
        player.bet = data.bet;
        console.log(`${player.name} bet ${data.bet}`);
        betCount++;
      } else if (player.bet) {
        betCount++;
      }
    });
    if (betCount === players.length) {
      setTimeout(function() {
        dealCards();
        io.sockets.emit('deal cards', {
          players: players, 
          dealer: [
            { img: '../images/card-back.jpg' },
            { img: dealer.hand[1].img }
          ]
        });
      }, 1000)
    }
  })

  socket.on('player ready', function() {
    io.to(players[playerTurn].id).emit('your turn');
  });

  socket.on('hit me', function() {
    let newCard = deck.shift();
    players.forEach((player) => {
      if (player.id === socket.id) {
        player.hand.push(newCard);
        player.total = calculateHand(player.hand);
        player = checkForAce(player);
        socket.emit('new card', {card: newCard, total: player.total});
        if (player.total > 21) {
          console.log(`${player.name} busted!`);
          if (playerTurn + 1 < players.length) {
            io.to(players[playerTurn].id).emit('turn over');
            playerTurn++;
            console.log(`player turn: ${playerTurn}`);
            io.to(players[playerTurn].id).emit('your turn');
          } else {
            io.to(players[playerTurn].id).emit('turn over');
            dealerTurn();
          }
        }
      }
    })
  });

  socket.on('stand', function() {
    if (playerTurn + 1 < players.length) {
      playerTurn++;
      io.to(players[playerTurn].id).emit('your turn');
    } else {
      dealerTurn();
    }
  })
  
  // socket.on('deal', function(player) {
  //   console.log(player.id, player.hand, player.total);
  // });

  socket.on('disconnect', function() {
    users.forEach((user, index) => {
      console.log(`${user.name} disconnected!`);
      if (socket.id === user.id) {
        users.splice(index, 1);
      }
    });
    players.forEach((player, index) => {
      console.log(`${player.name} no longer playing!`);
      if (socket.id === player.id) {
        players.splice(index, 1);
        socket.emit('player left', {player: player});
      }
    });

    if (players.length === 0) {
      dealer = {hand: [], total: 0};
    }
  });
});

const port = process.env.PORT || 4000;

server.listen(port, function() {
  console.log(`You're tuned in to port ${port}!`);
});