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
// the number of 52-card decks in the dealer's shoe
// casino's typically have 6
let shoeSize = 6;
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

  for (let i = 0; i < shoeSize; i++) {
    createDeck();
  }

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
  console.log('initial deal');
  // deal two for each player
  players.forEach((player) => {
    let firstCard = deck.shift();
    let secondCard = deck.shift();

    player.hand.push(firstCard);
    console.log(`${player.name} receives ${firstCard.value} of ${firstCard.suit}`);
    player.hand.push(secondCard);
    console.log(`${player.name} receives ${secondCard.value} of ${secondCard.suit}`);

    player.total = calculateHand(player.hand).total;
    player.displayTotal = calculateHand(player.hand).displayTotal;

  });

  // deal two for the dealer
  let firstCard = deck.shift();
  let secondCard = deck.shift();
  dealer.hand.push(firstCard);
  console.log(`Dealer receives ${firstCard.value} of ${firstCard.suit}`)
  dealer.hand.push(secondCard);
  console.log(`Dealer receives ${secondCard.value} of ${secondCard.suit}`)
  dealer.total = calculateHand(dealer.hand).total;
  dealer.displayTotal = calculateHand(dealer.hand).displayTotal;

  console.log(`${deck.length} cards left in shoe`);

}

function calculateHand(hand) {
  let total = hand.reduce((total, card) => {
    return total += card.realValue;
  }, 0);

  let displayTotal = `${total}`;

  if (hasAce(hand) && total + 10 <= 21) {
    displayTotal = `${total} (${total + 10})`;
    total += 10;
  }

  return {
    total: total,
    displayTotal: displayTotal
  };
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

  io.sockets.emit('whose turn', {id: null});

  while (dealer.total < 17) {
    let newCard = deck.shift();
    
    dealer.hand.push(newCard);
    console.log(`Dealer receives ${newCard.value} of ${newCard.suit}`);
    console.log(`${deck.length} cards left in shoe`);

    setTimeout(function() {
      io.sockets.emit('new dealer card', {card: newCard});
    }, timeout);

    dealer.total = calculateHand(dealer.hand).total;
    dealer.displayTotal = calculateHand(dealer.hand).displayTotal;
    timeout += 250;
  }

  setTimeout(function() {
    endGame();

    setTimeout(function() {
      resetGame();
    }, 1000);
  }, timeout);

}

function endGame() {
  let playerList = {};
  let gameInProgress = false;

  players.forEach((player) => {
    playerList[player.id] = true;
    
    console.log(`Checking ${player.name} win status...`);
    if (player.total > 21) {
      console.log(`${player.name} busted!`)
      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img,
        dealerTotal: dealer.total,
        status: 'lose',
        message: '',
      });
    } else if (dealer.total > 21 && (player.total < 21 || (player.total === 21 && player.hand.length > 2))) {
      console.log(`${player.name} won because dealer bust!`);
      player.money += player.bet * 2;
      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img, 
        dealerTotal: dealer.total,
        status: 'win',
        message: `Dealer busts! YOU WIN $${player.bet}!`,
      });
    } else if (dealer.total === player.total) {
      console.log(`${player.name} pushed!`)
      player.money += player.bet;
      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img, 
        dealerTotal: dealer.total,
        status: 'push', 
        message: 'PUSH!',
      });
    } else if (player.total > dealer.total) {
      if (player.total === 21 && player.hand.length === 2) {
        console.log(`${player.name} won by blackjack!`)
        var message = '';
      } else {
        console.log(`${player.name} won!`)
        player.money += player.bet * 2;
        var message = `YOU WIN $${player.bet}!`;
      }

      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img, 
        dealerTotal: dealer.total,
        status: 'win',
        message: message,
      });
    } else if (dealer.total > player.total) {
      console.log(`${player.name} lost.`)
      let message = 'Dealer wins.';

      if (dealer.total === 21 && dealer.hand.length === 2) {
        message += ' Dealer has blackjack.';
      }

      io.to(player.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img, 
        dealerTotal: dealer.total,
        status: 'lose',
        message: message,
      });
    }

    if (player.doubleDown) {
      player.bet /= 2;
    }
  });

  // for the spectator audience...
  users.forEach((user) => {
    if(!playerList[user.id]) {
      io.to(user.id).emit('game over', {
        dealerHiddenCard: dealer.hand[0].img,
        dealerTotal: dealer.total,
        status: '',
        message: 'Game over!',
      });
    };
  });

  io.sockets.emit('update money', {players: players});
}

function resetGame() {
  players.forEach((player) => {
    player.bet = 0;
    player.hand = [];
    player.total = 0;
    player.displayTotal = '';
    player.doubleDown = false;
    player.splitHand = null;
  })
  dealer.hand = [];
  dealer.total = 0;
  betCount = 0;
  playersReadyCount = 0;
  gameInProgress = false;

  if (deck.length < 52) {
    deck = shuffleDeck();
  }

  io.sockets.emit('sit invite');
}

////SOCKET.IO FUNCTIONALITY
let players = [];
let playersLeftToPlay = [];
let users = [];
let messages = [];
let dealer = {hand: [], total: 0};
let betCount = 0;
let playersReadyCount = 0;
let gameInProgress = false;

io.on('connection', function(socket) {
  console.log('new connection from ' + socket.id);
  
  socket.on('new user', function(data) {
    // let user = socket.handshake.query;
    console.log(`welcome ${data.name}!`);

    users.push({
      id: socket.id,
      name: data.name,
    });

    console.log(`welcoming ${socket.id} (${data.name})`);
    socket.emit('welcome', {
      users: users, 
      currentPlayers: players,
      chatMessages: messages,
      greeting: `Welcome, ${data.name}`, 
      gameInProgress: gameInProgress
    });

    if (gameInProgress) {
      socket.emit('fill me in', {
        currentPlayers: players,
        dealerHand: [
          { img: '../images/card-back.jpg' },
          { img: dealer.hand[1].img }
        ],
      })
      if (playersLeftToPlay[0]) {
        socket.emit('whose turn', {id: playersLeftToPlay[0].id});
      }
    }

    messages.push({name: '::', text: `${data.name} has joined`});
    io.sockets.emit('new user', `${data.name} has joined`);

    console.log(users);
    if (players.length < 5 && !gameInProgress) {
      socket.emit('sit invite');
    }
  });

  socket.on('name change', function(data) {
    users.forEach((user) => {
      if (user.id === socket.id) {
        let oldName = user.name;
        user.name = data.name;
        console.log(`${oldName} is now ${user.name}`);
        messages.push({name: '::', text: `${oldName} renamed to ${user.name}`});
        io.sockets.emit('name change', {name: user.name, id: socket.id, text: `${oldName} renamed to ${user.name}`});
      }
    });

    players.forEach((player) => {
      if (player.id === socket.id) {
        player.name = data.name;
      }
    });
  });

  socket.on('deal me in', function(data) {
    let newPlayer = {
      id: socket.id,
      name: data.name,
      hand: [],
      bet: 0,
      money: data.money,
      total: 0,
      displayTotal: '',
      doubleDown: false,
      splitHand: null,
    }
    players.push(newPlayer);
    console.log(`new player! ${newPlayer.name} / ${newPlayer.money}`);
    io.sockets.emit('new player', {newPlayer: newPlayer});
    if (players.length === 5) {
      io.sockets.emit('sit uninvite');
    }
  })

  socket.on('place bet', function(data) {
    players.forEach((player) => {
      if (player.id === socket.id) {
        player.bet = data.bet;
        player.money -= player.bet;
        console.log(`${player.name} bet ${data.bet}`);
        betCount++;
        console.log(`${betCount} out of ${players.length} have bet so far`);

        socket.broadcast.emit('player bet', {otherPlayer: player});
      }
    });

    if (betCount === players.length) {
      setTimeout(function() {
        gameInProgress = true;
        betCount = 0;
        dealCards();
        io.sockets.emit('deal cards', {
          players: players, 
          dealer: [
            { img: '../images/card-back.jpg' },
            { img: dealer.hand[1].img }
          ]
        });
        io.sockets.emit('sit uninvite');
      }, 1000);
    }
  })

  socket.on('player ready', function() {
    playersReadyCount++;
    console.log(`${socket.id} is ready`)
    if (playersReadyCount === players.length) {
      testForBlackjacks();
    };
  });

  function testForBlackjacks() {
    // if dealer gets blackjack, game is over
    if (dealer.total === 21) {
      console.log('dealer has blackjack! game over');

      endGame();

      setTimeout(function() {
        resetGame();
      }, 1000);

    } else {
      playersLeftToPlay = [...players];

      console.log('checking players for blackjack...');
      playersLeftToPlay.forEach((player, index, array) => {
        if (player.total === 21) {
          console.log(`${player.name} has blackjack!`);
          player.money += (player.bet + (player.bet * 1.5));
          // let player know their turn is over
          io.to(player.id).emit('turn over');
          io.sockets.emit('player bet', {otherPlayer: player});
          // remove them from the play order
          array.splice(index, 1);
          console.log(array.length);
        }
        if (array.length === 0) {
          endGame();

          setTimeout(function() {
            resetGame();
          }, 1000);
        }
      });
    }

    if(playersLeftToPlay.length > 0) {
      io.to(playersLeftToPlay[0].id).emit('your turn');
      io.sockets.emit('whose turn', {id: playersLeftToPlay[0].id});
    }
  }

  socket.on('double down', function() {
    players.forEach((player) => {
      if (player.id === socket.id) {
        console.log(`${player.name} doubles down! From $${player.bet} to $${player.bet * 2}!`);
        player.money -= player.bet;
        player.bet *= 2;
        player.doubleDown = true;
        io.sockets.emit('player bet', {otherPlayer: player});
      }
    });
  })

  socket.on('hit me', function() {
    let newCard = deck.shift();

    players.forEach((player) => {
      if (player.id === socket.id) {
        
        console.log(`${player.name} hits, dealing ${newCard.value} of ${newCard.suit}`);
        console.log(`${deck.length} cards left`);
        if (player.splitHand === null) {
          player.hand.push(newCard);
          player.total = calculateHand(player.hand).total;
          player.displayTotal = calculateHand(player.hand).displayTotal;
        } else {
          player.hand[splitHand].push(newCard);
          player.total[splitHand] = calculateHand(player.hand[splitHand]).total;
          player.displayTotal[splitHand] = calculateHand(player.hand[splitHand]).displayTotal;
        }
        
        io.sockets.emit('new card', {player: player, card: newCard});
        
        // if player busts...
        if (player.total > 21) {
          console.log(`${player.name} busted!`);
          let bustedPlayer;
          
          playersLeftToPlay.forEach((player, index) => {
            if (player.id === socket.id) {
              bustedPlayer = player;
              playersLeftToPlay.splice(index, 1);
            }
          });
          
          // if there are still players left
          if (playersLeftToPlay.length) {
            io.to(bustedPlayer.id).emit('turn over');
            console.log(`player turn: ${playersLeftToPlay[0].id}`);
            io.to(playersLeftToPlay[0].id).emit('your turn');
            io.sockets.emit('whose turn', {id: playersLeftToPlay[0].id});
          } else {
            io.to(bustedPlayer.id).emit('turn over');
            dealerTurn();
          }
        }
      }
    })
  });

  socket.on('stand', function() {
    let finishedPlayer;
    playersLeftToPlay.forEach((player, index) => {
      if (player.id === socket.id) {
        finishedPlayer = player;
        playersLeftToPlay.splice(index, 1);
      }
    });

    if (playersLeftToPlay.length) {
      io.to(playersLeftToPlay[0].id).emit('your turn');
      io.sockets.emit('whose turn', {id: playersLeftToPlay[0].id});
    } else {
      dealerTurn();
    }
  })

  socket.on('leave game', function() {
    players.forEach((player, index) => {
      if (player.id === socket.id) {
        players.splice(index, 1);
        io.sockets.emit('player left', {leftPlayer: player});
        console.log(`${player.name} (${socket.id}) is out`);
        io.sockets.emit('sit invite');
      }
    });

    playersLeftToPlay.forEach((player, index) => {
      if (player.id === socket.id) {
        playersLeftToPlay.splice(index, 1);
        if (index === 0 && playersLeftToPlay[0]) {
          io.to(playersLeftToPlay[0].id).emit('your turn');
          io.sockets.emit('whose turn', {id: playersLeftToPlay[0].id});
        }
      }
    });

    if (betCount === players.length && players.length !== 0 && !gameInProgress) {
      setTimeout(function() {
        gameInProgress = true;
        betCount = 0;
        dealCards();
        io.sockets.emit('deal cards', {
          players: players, 
          dealer: [
            { img: '../images/card-back.jpg' },
            { img: dealer.hand[1].img }
          ]
        });
        io.sockets.emit('sit uninvite');
      }, 1000);
    }

    if (players.length === 0) {
      console.log('no more players! resetting...');
      io.sockets.emit('reset board');
      resetGame();
    }
  });

  socket.on('left user', function() {
    users.forEach((user, index) => {
      if (socket.id === user.id) {
        console.log(`${user.name} disconnected!`);
        users.splice(index, 1);
        messages.push({name: '::', text: `${user.name} left`});
        io.sockets.emit('user left', {user: user});
      }
    });

    players.forEach((player, index) => {
      console.log(`${player.name} no longer playing!`);
      if (socket.id === player.id) {
        players.splice(index, 1);
        io.sockets.emit('player left', {leftPlayer: player});
      }
    });

    playersLeftToPlay.forEach((player, index) => {
      if (player.id === socket.id) {
        playersLeftToPlay.splice(index, 1);
        if (index === 0 && playersLeftToPlay[0]) {
          io.to(playersLeftToPlay[0].id).emit('your turn');
          io.sockets.emit('whose turn', {id: playersLeftToPlay[0].id});
        }
      }
    });

    if (betCount === players.length && players.length !== 0 && !gameInProgress) {
      setTimeout(function() {
        gameInProgress = true;
        betCount = 0;
        dealCards();
        io.sockets.emit('deal cards', {
          players: players, 
          dealer: [
            { img: '../images/card-back.jpg' },
            { img: dealer.hand[1].img }
          ]
        });
        io.sockets.emit('sit uninvite');
      }, 1000);
    }

    if (players.length === 0) {
      dealer = {hand: [], total: 0};
      console.log('no more players! resetting...');
      io.sockets.emit('reset board');
      resetGame();
    }
  })

  socket.on('disconnect', function() {
    users.forEach((user, index) => {
      console.log(`${user.name} disconnected!`);
      if (socket.id === user.id) {
        users.splice(index, 1);
        messages.push({name: '::', text: `${user.name} left`});
        io.sockets.emit('user left', {user: user});
      }
    });

    players.forEach((player, index) => {
      console.log(`${player.name} no longer playing!`);
      if (socket.id === player.id) {
        players.splice(index, 1);
        io.sockets.emit('player left', {leftPlayer: player});
      }
    });

    playersLeftToPlay.forEach((player, index) => {
      if (player.id === socket.id) {
        playersLeftToPlay.splice(index, 1);
        if (index === 0 && playersLeftToPlay[0]) {
          io.to(playersLeftToPlay[0].id).emit('your turn');
          io.sockets.emit('whose turn', {id: playersLeftToPlay[0].id});
        }
      }
    });

    if (betCount === players.length && players.length !== 0 && !gameInProgress) {
      setTimeout(function() {
        gameInProgress = true;
        betCount = 0;
        dealCards();
        io.sockets.emit('deal cards', {
          players: players, 
          dealer: [
            { img: '../images/card-back.jpg' },
            { img: dealer.hand[1].img }
          ]
        });
        io.sockets.emit('sit uninvite');
      }, 1000);
    }

    if (players.length === 0) {
      dealer = {hand: [], total: 0};
      console.log('no more players! resetting...');
      io.sockets.emit('reset board');
      resetGame();
    }
  });

  socket.on('chat message', function(data) {
    if (messages.length > 100) {
      messages.pop();
    }
    if (data.text === '>userlist') {
      socket.emit('list users', users);
    } else {
      messages.push({name: data.name, text: data.text});
      io.sockets.emit('new message', {name: data.name, id: socket.id, text: data.text});
    }
  });
});

const port = process.env.PORT || 4000;

server.listen(port, function() {
  console.log(`You're tuned in to port ${port}!`);
});