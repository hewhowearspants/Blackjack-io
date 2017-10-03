// var socket = io();

$(document).ready(function() {
console.log('main.js loaded');

let deck = [];
let playerWallet = parseInt(localStorage.getItem('playerMoney')) || 1000;
let playerName = localStorage.getItem('playerName') || 'player';
let player = {name: playerName, hand: [], money: playerWallet, bet: 0};
let dealer = {name: 'dealer', hand: []};
let users = [];
let players = [];
var socket = io({query: {
  name: player.name,
  hand: player.hand,
  bet: player.bet,
}});

if (playerWallet) {
  player.money = playerWallet;
} else {
  player.money = 1000;
};

// Object prototype for creating Card objects.
var Card = function(suit,value,realValue) {
  this.suit = suit;
  this.value = value;
  this.realValue = realValue;
  this.img = `../images/Playing-Cards/${value}_of_${suit}.png`;
};

deck = createDeck();

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

  prefetchDeckImages();
};

// PRELOADS CARD DECK IMAGES
function prefetchDeckImages() {
  deck.forEach((card) => {
    let $imageLink = $('<link>', {'rel': 'prefetch', 'href': `${card.img}`});
    $('head').append($imageLink);
  });
};

// SHUFFLES CARD DECK AFTER CREATING THEM
function shuffleDeck() {
  // console.log('shuffling deck...')

  // createDeck();

  // let deckSize = deck.length;
  // let shuffleDeck = [];
  // let randIndex;

  // for(let i = 0; i < deckSize; i++) {
  //   randIndex = Math.floor(Math.random() * deck.length);
  //   shuffleDeck.push(deck.splice(randIndex, 1)[0]);
  // };

  // return shuffleDeck;
};

// PROVIDES INPUT FIELD FOR PLAYER TO INPUT BET AMOUNT
function placeBet(turn) {
  let $inputBet = $('<input>', {'type': 'number', 'id': 'input-bet', 'min': 1, 'max': `${player.money}`, 'value': `${player.bet || 5}`, 'formmethod': 'post'});
  let $submitBet = $('<input>', {'type': 'submit', 'id': 'submit-bet', 'value': 'BET'});
  let $messageBox = $('#message');
  let $dealButton = $('#deal-button');

  $dealButton.addClass('subdued');
  $dealButton.off('click');

  // $messageBox.html('<p>Place your bet: </p>');
  $messageBox.html('');
  $messageBox.append($inputBet);
  $messageBox.append($submitBet);

  $inputBet.keypress(function(event) {
    let betAmount = parseInt($inputBet.val());
    if (event.keyCode == 13 || event.which == 13) {
      setBet(betAmount);
    };
  });

  $submitBet.on('click', function() {
    let betAmount = parseInt($inputBet.val());
    setBet(betAmount);
  });
};

// ACCEPTS THE BET INPUT AND STARTS THE GAME ONLY IF PLAYER BETS BETWEEN 1 AND ALL OF THEIR MONEY
function setBet(betAmount) {
  let $messageBox = $('#message');
  if (betAmount > 0 && betAmount <= player.money) {
    player.bet = betAmount;
    player.money -= player.bet;
    $('#player-money p').text(`$${centify(player.money)}`);
    $('#player-bet p').text(`$${player.bet}`);

    socket.emit('place bet', {name: player.name, bet: player.bet});
    //dealHand();

  } else {
    let $messageText = $('<p>');
    $messageText.text('Not a valid bet!');
    $messageText.css({'color': 'orange', 'font-size':'14px'});
    $messageBox.append($messageText);
    $messageText.delay(1000).fadeOut('fast');
    setTimeout(function() {
      $messageText.remove();
    }, 2000);
  };
};

// GIVES PLAYER MONEY IF THEY WIN
// WINS PAY 2 TO 1
// BLACKJACK PAYS 3 TO 2
function winMoney(turn, multiplier) {
  turn.money += turn.bet * multiplier;
  $('#player-money p').text(`$${centify(turn.money)}`);
  localStorage.setItem('playerMoney', turn.money);
  // console.log(`${turn.name} won ${turn.bet}, now has ${turn.money}`);
};

// RETURNS THE PLAYER'S BET IF THEY PUSH WITH THE DEALER
function pushMoney(turn) {
  turn.money += turn.bet;
  $('#player-money p').text(`$${centify(turn.money)}`);
  localStorage.setItem('playerMoney', turn.money);
  // console.log(`${turn.name} gets their money back`);
}

// DISPLAYS 2 DIGITS IF PLAYER HAS DOLLARS AND CENTS
function centify(amount) {
  if (amount % 1) {
    return amount.toFixed(2);
  } else {
    return amount;
  }
};

// DEALS THE INITIAL TWO CARDS AND TESTS FOR BLACKJACK
function dealCards(players, dealer) {
  // console.log('deal em out!');

  let $messageBox = $('#message');
  let $dealButton = $('#deal-button');

  $messageBox.text('Dealing \'em out!');

  // hitMe(dealer);
  // hitMe(dealer);
  // hitMe(player);
  // hitMe(player);

  players.forEach((serverPlayer) => {
    if (serverPlayer.id === socket.id) {
      player.hand.forEach((card) => {
        let $newCard = ($('<div>', {'class': 'card removed'}));
        $newCard.css('background-image', `url('${card.img}')`);
        $('#player-hand').append($newCard);
      });
      $('#player-total p').text(player.total);
    }
  })

  dealer.forEach((dealerCard) => {
    let $newCard = ($('<div>', {'class': 'card removed'}));
    $newCard.css('background-image', `url('${dealerCard.img}')`);
    $('#dealer-hand').append($newCard);
  })

  // dealer's first card is hidden
  // $('#dealer-hand div:nth-child(1)').css('background-image', 'url("../images/card-back.jpg")');

  // below is the animation timing allowing the cards to fly in in order, as if dealt by a dealer
  // see style.css for animation details
  $('.hand').children().removeClass('removed');
  $('.hand').children().addClass('hidden');

  var timeout = 0;

  for (let i = 1; i < 3; i++) {
    setTimeout(function () {
      $(`#dealer-hand div:nth-child(${i})`).removeClass('hidden');
      $(`#dealer-hand div:nth-child(${i})`).addClass('flyin');
    }, timeout);
    timeout += 250;
  };

  for (let i = 1; i < 3; i++) {
    setTimeout(function () {
      $(`#player-hand div:nth-child(${i})`).removeClass('hidden');
      $(`#player-hand div:nth-child(${i})`).addClass('flyin');
    }, timeout);
    timeout += 250;
  };

  // tests if either player or dealer gets Blackjack (21 with two cards)
  // ends the game if so, resumes game if not
  setTimeout(function () {
    $('#player-box').removeClass('hidden');
    $('#button-bar').children().removeClass('removed');
    socket.emit('player ready');
    // if(testForBlackjack()) {
    //   endGame();
    // } else {
    //   startGame();
    // };
  }, timeout);

};

// DISPLAYS APPROPRIATE MESSAGE IF PLAYER OR DEALER GETS BLACKJACK (21 with two cards)
function testForBlackjack() {
  // console.log('checking for blackjack...');

  let $messageBox = $('#message');

  if (player.total === 21 && dealer.total === 21) {
    pushMoney(player);
    $messageBox.html('PUSH!');
    return true;
  } else if (player.total === 21) {
    winMoney(player, (3/2));
    $messageBox.html(`Blackjack pays 3:2!</p>You win $${centify(player.bet * (3/2))}!`);
    return true;
  } else if (dealer.total === 21) {
    $messageBox.html('Dealer has blackjack!<br/>Dealer wins.');
    return true;
  };
};

// ADDS A CARD TO THE INDICATED PLAYER'S HAND, UPDATES PLAYER TOTAL
// ADJUSTS CALCULATION IF ACE IS PRESENT
function hitMe(card, total) {
  // console.log(`${turn.name} hits!`);
  let $newCard = ($('<div>', {'class': 'card removed'}));
  //let newCard = deck.shift();

  $newCard.css('background-image', `url('${card.img}')`);

  player.hand.push(card);
  $newCard.attr('id', `player-card-${player.hand.length}`);
  $(`#player-hand`).append($newCard);
  $newCard.removeClass('removed');
  $newCard.addClass('flyin');

  player.total = total;

  $(`#player-total p`).text(total);

};

// RETURNS INDICATED PLAYER'S TOTAL VALUE OF THEIR HAND
function calculateHand(turn) {
  //console.log(`calculating ${turn.name} hand total...`);
  return turn.hand.reduce((total, card) => {
    return total += card.realValue;
  }, 0);

};

// ADDS 10 TO PLAYER'S TOTAL IF THEY HAVE AN ACE AND IT WON'T PUT THEM OVER 21
// DISPLAYS BOTH POSSIBLE TOTALS
function checkForAce(turn) {
  if (hasAce(turn) && (turn.total + 10 <= 21)) {
    $(`#${turn.name}-total p`).text(`${turn.total} (${turn.total + 10})`)
    turn.total += 10;
  };

};

// RETURNS WHETHER THE INDICATED PLAYER HAS AN ACE IN THEIR HAND
function hasAce(turn) {
  let hasAce = false;

  turn.hand.forEach ((card) => {
    if (card.value === 'A') {
      hasAce = true;
    };
  });

  return hasAce;
};

// INITIALIZES HIT AND STAND BUTTONS
function startGame() {
  // console.log('game begins!');
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  let $dealButton = $('#deal-button');

  $('#message').text(' ');

  // darken deal button
  $dealButton.addClass('subdued');
  $dealButton.off('click');

  // un-darken hit button, add event listener
  $hitButton.removeClass('subdued');
  $hitButton.on('click', function() {
    hitMe(player);
    $('#player-hand div:last-child').removeClass('removed');
    $('#player-hand div:last-child').addClass('flyin');
    // ends game if player goes over 21 after hitting
    if (testForBust(player)){
      checkWinConditions();
    };
  });

  // un-darken stand button, add event listener
  $standButton.removeClass('subdued');
  $standButton.on('click', function() {
    dealerTurn();
  });

};

// RUNS THE DEALER'S TURN, HITTING UNTIL THEY ARE OVER 16
// function dealerTurn() {
//   // darken hit and stand buttons
//   $('#hit-button').off('click');
//   $('#hit-button').addClass('subdued');
//   $('#stand-button').off('click');
//   $('#stand-button').addClass('subdued');

//   let timeout = 0;

//   while (dealer.total < 17) {
//     hitMe(dealer);
//   };

//   // sets timing for new dealer card animations
//   for(let i = 2; i <= dealer.hand.length; i++) {
//     setTimeout(function(x) {
//       $(`#dealer-hand div:nth-child(${x})`).removeClass('removed');
//       $(`#dealer-hand div:nth-child(${x})`).addClass('flyin');
//     }, timeout, i);
//     timeout += 250;
//   }

//   // checks win conditions after animations are done playing
//   setTimeout(function() {
//     checkWinConditions();
//   }, timeout + 250);

// };

// GIVES MONEY TO PLAYER IF THEY WIN OR PUSH, THEN GOES TO END GAME
// function checkWinConditions() {
//   let $messageBox = $('#message');

//   setTimeout(function () {
//   if (testForBust(player)) {
//     $messageBox.html('BUST!');
//   } else if (testForBust(dealer)) {
//     winMoney(player, 2);
//     $messageBox.html(`Dealer busts!<br/>YOU WIN $${player.bet}!`);
//   } else if (dealer.total === player.total) {
//     pushMoney(player);
//     $messageBox.html('PUSH!');
//   } else if (dealer.total > player.total) {
//     $messageBox.html('Dealer wins.');
//   } else if (dealer.total < player.total) {
//     winMoney(player, 2);
//     $messageBox.html(`YOU WIN $${player.bet}!`);
//   };

//   }, 1000);

//   endGame();
// };

// RETURNS WHETHER OR NOT INDICATED PLAYER HAS GONE OVER 21
function testForBust(turn) {
  return turn.total > 21;
};

// SHOWS DEALER'S HIDDEN CARD, DEACTIVATES HIT/STAND BUTTON,
// REACTIVATES DEAL BUTTON TO RESET GAME
function endGame(dealerHiddenCard, dealerTotal, winStatus, message) {
  // console.log('game finished!');
  let $messageBox = $('#message');
  let $dealButton = $('#deal-button');
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  let $dealerFirstCard = $('#dealer-hand div:nth-child(1)')

  $dealerFirstCard.removeClass('flyin');
  $dealerFirstCard.addClass('loop');
  setTimeout(function() {
    $('#dealer-box').removeClass('hidden');
    $dealerFirstCard.css('background-image', `url(${dealerHiddenCard}`);
  }, 500);

  // $hitButton.off('click');
  // $hitButton.addClass('subdued');

  // $standButton.off('click');
  // $standButton.addClass('subdued');

  if (winStatus === 'win') {
    player.money += player.bet * 2;
    player.bet = 0;
    $('#player-bet p').html('$0');
    $('#player-money p').text(`${centify(player.money)}`);
    localStorage.setItem('playerMoney', player.money);
  } else if (winStatus === 'push') {
    player.money += player.bet;
    player.bet = 0;
    $('#player-bet p').html('$0');
    $('#player-money p').text(`${centify(player.money)}`);
    localStorage.setItem('playerMoney', player.money);
  } else if (winStatus === 'lose') {
    $('#player-bet p').html('$0');
    $('#player-money p').text(`${centify(player.money)}`);
    localStorage.setItem('playerMoney', player.money);
  }

  $messageBox.html(`<p>${message}</p>`)
  $('#dealer-total p').text(dealerTotal);
  $('#dealer-box').removeClass('hidden');

  $dealButton.removeClass('subdued');
  $dealButton.text('AGAIN?');
  $dealButton.one('click', resetGame);
};

// RESETS GAME & RESTARTS IF PLAYER STILL HAS MONEY
// SHUFFLES DECK IF DECK ONLY HAS 10 CARDS LEFT IN IT
function resetGame() {
  $('.hand').children().remove();
  $('#message').text(' ');
  $('#player-box').addClass('hidden');
  $('#dealer-box').addClass('hidden');
  player.hand = [];
  dealer.hand = [];

  if(player.money > 0) {
    if(deck.length < 10) {
      deck = shuffleDeck();
    };
    placeBet(player);
  } else {
    $('#deal-button').addClass('subdued');
    $('#message').text('You\'re outta cash! Get outta here, ya bum!');
  };

};

// CREATES AND PLACES ALL DOM ELEMENTS
function setUpTable () {
  console.log('setting up table!');
  let $cardTable = ($('<div>', {'class': 'container', 'id': 'card-table'}));
  let $dealerHand = ($('<div>', {'class': 'hand', 'id': 'dealer-hand'}));
  let $playerHand = ($('<div>', {'class': 'hand', 'id': 'player-hand'}));

  let $banner = ($('<div>', {'class': 'banner'}));
  let $moneyBox = ($('<div>', {'class': 'text-container', 'id': 'money-box'}));
  let $playerMoney = ($('<div>', {'class': 'text-box', 'id': 'player-money'})).html(`<span>Money <p>$${player.money}</p> </span>`);
  let $playerBet = ($('<div>', {'class': 'text-box', 'id': 'player-bet'})).html(`<span>Bet <p>$${player.bet}</p> </span>`);
  let $messageBox = ($('<div>', {'class': 'text-container', 'id': 'message-box'}));
  let $message = ($('<div>', {'class': 'text-box', 'id': 'message'}));
  let $totalBox = ($('<div>', {'class': 'text-container', 'id': 'total-box'}));
  let $playerTotal = ($('<div>', {'class': 'text-box hidden', 'id': 'player-box'})).html('<span id="player-total">Player <p>0</p> </span>');
  let $dealerTotal = ($('<div>', {'class': 'text-box hidden', 'id': 'dealer-box'})).html('<span id="dealer-total">Dealer <p>0</p> </span>');

  let $buttons = ($('<div>', {'id': 'button-bar'}));
  let $dealButton = ($('<button>', {'class': 'button removed subdued', 'id': 'deal-button'})).text('DEAL');
  let $hitButton = ($('<button>', {'class': 'button removed subdued', 'id': 'hit-button'})).text('HIT');
  let $standButton = ($('<button>', {'class': 'button removed subdued', 'id': 'stand-button'})).text('STAND');

  let $infoButton = $('<div>', {'class': 'info', 'id': 'info-button'}).text('?');

  let $infoPanelOverlay = $('<div>', {'class': 'removed', 'id': 'info-panel-overlay'});
  let $infoPanel = $('<div>', {'id': 'info-panel'});
  let $infoContent = $('<p>', {'id': 'info-content'});
  let $okButton = $('<button>', {'id': 'ok-button'}).text('OK');

  $infoContent.html("<p>Blackjack, also known as 21, is a card game where a player faces off against a dealer. The dealer and the player each initially get two cards. The player can only see one of the dealer's cards. The cards's are worth face value, except Aces and face cards (J, Q, K), which are 1 or 11 and 10, respectively.</p><br/>"
    +"<p>The player's goal is to get the sum of their cards higher than the sum of the dealer's cards, without that sum going over 21 ('BUST'). The player can request additional cards (or 'HIT') if they want to increase their chances of beating the dealer. When the player is satisfied, and has not gone over 21, they can end their turn (or 'STAND').</p><br/>"
    +"<p>When the player has ended their turn, if sum of the dealer's hand is less than 16, the dealer will 'HIT' until their hand is worth more than 16, at which point, the dealer stands. If the dealer 'BUSTS', the player automatically wins.</p><br/>"
    +"<p>After the dealer stands, the dealer's hidden card is revealed to the player, and if the sum of the player's hand is higher than the dealer, the player wins. If they are equal, then it is a tie game, or 'PUSH'.</p><br/>"
    +"<p>Blackjack is frequently played in casinos, and players bet a certain amount on winning. If the player wins, they get double their money back. If the player and dealer 'PUSH', the player gets only their initial bet back.</p>"
    );


  $('body').append($cardTable);
  $('body').append($infoButton);
  $('body').append($infoPanelOverlay);

  $infoPanelOverlay.append($infoPanel);
  $infoPanel.append($infoContent);
  $infoPanel.append($okButton);
  $infoPanel.fadeIn();

  $('#card-table').append($dealerHand);

  $('#card-table').append($banner);

  $('.banner').append($moneyBox);
  $('#money-box').append($playerMoney);
  $('#money-box').append($playerBet);

  $('.banner').append($messageBox);
  $('#message-box').append($message);

  $('.banner').append($totalBox);
  $('#total-box').append($playerTotal);
  $('#total-box').append($dealerTotal);

  $('#card-table').append($buttons);
  $('#button-bar').append($dealButton);
  $('#button-bar').append($hitButton);
  $('#button-bar').append($standButton);

  $('#card-table').append($playerHand);

  $('#deal-button').on('click', function() {
    placeBet(player);
  });

  $('#info-button').on('click', function() {
    $infoPanelOverlay.removeClass('removed');
  });

  $('#ok-button').on('click', function(){
    $infoPanelOverlay.addClass('removed');
  });

  player.$hand = $('#player-hand');
  dealer.$hand = $('#dealer-hand');
};

setUpTable();

socket.on('welcome', function(data) {
  users = data.users;
  players = data.players;
  console.log(users);
  console.log(players);
  $('#message').html(`<p>${data.greeting}!</p>`);
});

socket.on('sit invite', function() {
  let $sitButton = $('<button>', {id: 'sit-button'}).text('SIT');
  console.log($('#player-hand').children());
  if($('#player-hand').children().length === 0) {
    $('#player-hand').append($sitButton);
  }
  $('#sit-button').on('click', function() {
    socket.emit('deal me in', {name: player.name});
    $sitButton.remove();
    placeBet();
  })
});

socket.on('deal cards', function(data) {
  data.players.forEach((serverPlayer) => {
    if (serverPlayer.id === socket.id) {
      player.hand = serverPlayer.hand;
      player.total = serverPlayer.total;
    }
  })
  dealCards(data.players, data.dealer)
  console.log(data.players);
  console.log(data.dealer);
});

socket.on('your turn', function() {
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  $hitButton.removeClass('subdued');
  $standButton.removeClass('subdued');
  $hitButton.on('click', function() {
    socket.emit('hit me');
  });
  $standButton.on('click', function() {
    socket.emit('stand');

    let $hitButton = $('#hit-button');
    let $standButton = $('#stand-button');
    $hitButton.addClass('subdued');
    $standButton.addClass('subdued');
    $hitButton.off('click');
    $standButton.off('click');
  });
});

socket.on('new card', function(data) {
  hitMe(data.card, data.total);
})

socket.on('turn over', function() {
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  $hitButton.addClass('subdued');
  $standButton.addClass('subdued');
  $hitButton.off('click');
  $standButton.off('click');
  if (player.total > 21) {
    $('#message').html('<p>BUSTED</p>');
    player.bet = 0;
    $('#player-bet p').html('$0');
    localStorage.setItem('playerMoney', player.money);
  }
});

socket.on('new dealer card', function(data) {
  let timeout = 0;
  let $newCard = ($('<div>', {'class': 'card removed'}));
  $newCard.css('background-image', `url('${data.card.img}')`);
  $(`#dealer-hand`).append($newCard);
  setTimeout(function() {
    $newCard.removeClass('removed');
    $newCard.addClass('flyin');
  }, 250);
});

socket.on('game over', function(data) {
  endGame(data.dealerHiddenCard, data.dealerTotal, data.status, data.message);
})

});
