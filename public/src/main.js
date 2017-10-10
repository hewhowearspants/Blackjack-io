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

// PLAYER MUST INPUT A NAME BEFORE JOINING THE GAME
function inputName() {
  let $inputName = $('<input>', {'type': 'text', 'id': 'input-name', 'formmethod': 'post', 'placeholder': 'enter your name'});
  let $submitName = $('<input>', {'type': 'submit', 'id': 'submit-name', 'value': 'GO'});
  $('body').append($inputName);
  $('body').append($submitName);

  $inputName.keypress(function(event) {
    let name = $inputName.val();
    if (event.keyCode == 13 || event.which == 13) {
      player.name = name;
      $inputName.remove();
      $submitName.remove();
      // let server know there's a new user in town
      socket.emit('new user', { name: player.name });
      setUpTable();
    };
  });

  $submitName.on('click', function() {
    let name = $inputName.val();
    player.name = name;
    $inputName.remove();
    $submitName.remove();
    // let server know there's a new user in town
    socket.emit('new user', { name: player.name });
    setUpTable();
  });
}

// CREATES AND PLACES ALL DOM ELEMENTS
function setUpTable () {
  console.log('setting up table!');
  let $cardTable = ($('<div>', {'class': 'container', 'id': 'card-table'}));
  let $dealerHand = ($('<div>', {'class': 'hand', 'id': 'dealer-hand'}));
  let $playersContainer = ($('<div>', {'class': 'player-container', 'id': 'players-container'}));
  let $playerHand = ($('<div>', {'class': 'hand', 'id': 'player-hand'}));
  let $otherPlayerHand = ($('<div>', {'class': 'hand'}));

  let $banner = ($('<div>', {'class': 'banner'}));
  let $moneyBox = ($('<div>', {'class': 'text-container', 'id': 'money-box'}));
  let $playerMoney = ($('<div>', {'class': 'text-box hidden', 'id': 'player-money'})).html(`<span>Money <p>$${player.money}</p> </span>`);
  let $playerBet = ($('<div>', {'class': 'text-box hidden', 'id': 'player-bet'})).html(`<span>Bet <p>$${player.bet}</p> </span>`);
  let $messageBox = ($('<div>', {'class': 'text-container', 'id': 'message-box'}));
  let $message = ($('<div>', {'class': 'text-box', 'id': 'message'}));
  let $totalBox = ($('<div>', {'class': 'text-container', 'id': 'total-box'}));
  let $playerTotal = ($('<div>', {'class': 'text-box hidden', 'id': 'player-box'})).html('<span id="player-total">Player <p>0</p> </span>');
  let $dealerTotal = ($('<div>', {'class': 'text-box hidden', 'id': 'dealer-box'})).html('<span id="dealer-total">Dealer <p>0</p> </span>');

  let $buttons = ($('<div>', {'id': 'button-bar'}));
  let $hitButton = ($('<button>', {'class': 'button removed subdued', 'id': 'hit-button'})).text('HIT');
  let $standButton = ($('<button>', {'class': 'button removed subdued', 'id': 'stand-button'})).text('STAND');

  let $infoButton = $('<div>', {'class': 'info', 'id': 'info-button'}).text('?');

  let $infoPanelOverlay = $('<div>', {'class': 'removed', 'id': 'info-panel-overlay'});
  let $infoPanel = $('<div>', {'id': 'info-panel'});
  let $infoContent = $('<p>', {'id': 'info-content'});
  let $okButton = $('<button>', {'id': 'ok-button'}).text('OK');

  let $chatContainer = $('<div>', {'id': 'chat-container'});
  let $chatContent = $('<div>', {'id': 'chat-content'});
  let $chatMessages = $('<div>', {'id': 'chat-messages'});
  let $chatForm = $('<form>', {'id': 'chat-form', 'action': ''});
  let $chatInput = $('<input>', {'id': 'chat-input', 'autocomplete': 'off'});
  let $chatSubmit = $('<button>', {'id': 'chat-submit'}).text('SEND');

  $infoContent.html("<p>Blackjack, also known as 21, is a card game where a player faces off against a dealer. The dealer and the player each initially get two cards. The player can only see one of the dealer's cards. The cards's are worth face value, except Aces and face cards (J, Q, K), which are 1 or 11 and 10, respectively.</p><br/>"
    +"<p>The player's goal is to get the sum of their cards higher than the sum of the dealer's cards, without that sum going over 21 ('BUST'). The player can request additional cards (or 'HIT') if they want to increase their chances of beating the dealer. When the player is satisfied, and has not gone over 21, they can end their turn (or 'STAND').</p><br/>"
    +"<p>When the player has ended their turn, if sum of the dealer's hand is less than 16, the dealer will 'HIT' until their hand is worth more than 16, at which point, the dealer stands. If the dealer 'BUSTS', the player automatically wins.</p><br/>"
    +"<p>After the dealer stands, the dealer's hidden card is revealed to the player, and if the sum of the player's hand is higher than the dealer, the player wins. If they are equal, then it is a tie game, or 'PUSH'.</p><br/>"
    +"<p>Blackjack is frequently played in casinos, and players bet a certain amount on winning. If the player wins, they get double their money back. If the player and dealer 'PUSH', the player gets only their initial bet back.</p>"
    );


  $('body').append($cardTable);
  $('body').append($infoButton);
  $('body').append($chatContainer);
  $('body').append($infoPanelOverlay);

  $infoPanelOverlay.append($infoPanel);
  $infoPanel.append($infoContent);
  $infoPanel.append($okButton);
  $infoPanel.fadeIn();

  $chatContainer.append($chatContent);
  $chatContent.append($chatMessages);

  $chatContainer.append($chatForm);
  $chatForm.append($chatInput);
  $chatForm.append($chatSubmit);

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
  $('#button-bar').append($hitButton);
  $('#button-bar').append($standButton);

  $('#card-table').append($playersContainer);
  for (let i = 1; i <= 5; i++) {
    let $handContainer = $('<div>', {'class': 'hand-container'});
    $handContainer.append($('<div>', {'class': 'hand-user-info'}));
    if (i === 3) {
      $handContainer.append($('<div>', {'class': 'hand primary'}));
    } else {
      $handContainer.append($('<div>', {'class': 'hand other'}));
    }
    $('#players-container').append($handContainer);
  }

  $('#info-button').on('click', function() {
    $infoPanelOverlay.removeClass('removed');
  });

  $('#ok-button').on('click', function(){
    $infoPanelOverlay.addClass('removed');
  });

  $('#chat-form').on('submit', function() {
    let text = $('#chat-input').val();
    socket.emit('chat message', {text: text, name: player.name});
    $('#chat-input').val('');
    return false;
  });

  //player.$hand = $('#player-hand');
  //dealer.$hand = $('#dealer-hand');

  // PLACEHOLDER TO SKIP NAME INPUT, REMOVE FOR PRODUCTION
  //socket.emit('new user', { name: player.name });
};

// 'welcome' IS SERVER'S RESPONSE TO 'new user'
socket.on('welcome', function(data) {
  // 'data' is users, currentPlayers, dealerHand, greeting, gameInProgress
  users = data.users;
  players = data.currentPlayers;
  dealer.hand = data.dealerHand;
  data.currentPlayers.forEach((currentPlayer) => {
    assignNewPlayer(currentPlayer);
  });
  $('#message').html(`<p>${data.greeting}!</p>`);
  data.chatMessages.forEach((chatMessage) => {
    let $name = $('<span>', {'class': 'chat-username'}).text(`${chatMessage.name}: `);
    let $text = $('<span>', {'class': 'chat-text'}).text(chatMessage.text);
    let $message = $('<p>', {'class': 'chat-message'}).append($name).append($text);

    $('#chat-messages').prepend($message);
  });
});

// 'fill me in' IS THE SERVER UPDATING YOU ABOUT THE CARDS CURRENTLY IN PLAY
// (for some reason, player socket IDs weren't being sent through the server's 'welcome' emit)
socket.on('fill me in', function (data) {
  console.log(data);
  players = data.currentPlayers;
  dealer.hand = data.dealerHand;
  dealCards(data.currentPlayers, data.dealerHand);
});

// 'new user' IS THE SERVER NOTIFYING YOU OF A NEW USER
socket.on('new user', function(message) {
  let $name = $('<span>', {'class': 'chat-username'}).text(`::: `);
  let $text = $('<span>', {'class': 'chat-text'}).text(message);
  let $message = $('<p>', {'class': 'notification', 'id': 'user-joined-notification'}).append($name).append($text);

  $('#chat-messages').prepend($message);
});

// 'sit invite' CREATES A 'SIT' BUTTON FOR USER TO JOIN GAME AS PLAYER
// WILL ONLY BE SENT IF THE SERVER'S gameInProgress IS false
socket.on('sit invite', function() {
  let $sitButton = $('<button>', {id: 'sit-button', style: 'align-self: flex-start; margin-top: 10px;'}).text('SIT');

  // only add if there isn't already a sit button and you're not already playing
  if($('#sit-button').length === 0 && $('.primary').attr('id') !== 'player-hand') {
    $('.primary').append($sitButton);

    $('#sit-button').on('click', function() {
      // tells server that you're joining as player
      socket.emit('deal me in', {name: player.name});
      $('#money-box').children().removeClass('hidden');
      $('.primary').attr({'id': 'player-hand'});
      $sitButton.remove();
      placeBet();
    })
  }

});

// 'sit uninvite' REMOVES THE 'SIT' BUTTON IF SERVER DETERMINES THAT THE GAME HAS STARTED
socket.on('sit uninvite', function() {
  $('#sit-button').remove();
});

// 'new player' IS THE SERVER NOTIFYING YOU OF A NEW PLAYER
socket.on('new player', function (data) {
  players.push(data.newPlayer);
  assignNewPlayer(data.newPlayer);
});

// ASSIGNS A NEW PLAYER TO AN OPEN SEAT
function assignNewPlayer(newPlayer) {
  // if new player is not you...
  if (newPlayer.id !== socket.id) {
    // ...find the first open hand and assign them to it
    $('.other').each(function(index) {
      if (!$(this).attr('id')) {
        $(this).attr({'id': newPlayer.id});
        $(this).addClass('occupied');
        let $playerName = $('<p>').text(`${newPlayer.name} / $${newPlayer.bet} / ${newPlayer.total}`);
        $(this).prev().append($playerName);
        newPlayer.id = null;
        return false;
      }
    });
    // ...assign them to the center spot if all the others are filled
    if (players.length === 5) {
      $('.primary').first().addClass('occupied')
      $('.primary').first().attr({'id': newPlayer.id});
    };
  }
}


socket.on('player left', function(data) {
  // 'data' is leftPlayer
  if (data.leftPlayer.id !== socket.id) {
    removePlayer(data.leftPlayer);
  }
});

// REMOVES A DEPARTING PLAYER FROM THE TABLE
function removePlayer(leftPlayer) {
  console.log(`${leftPlayer.id} left! removing!`);
  let $primaryHand = $('.primary').first();

  if (leftPlayer.id !== socket.id) {
    $('.other').each(function(index) {
      if ($(this).attr('id') === leftPlayer.id) {
        $(this).attr({'id': ''});
        $(this).removeClass('occupied');
        $(this).children().remove();
        $(this).prev().children().remove();
        // if there is a non-you user in the primary hand spot, put them in this now-empty spot
        // so you have the option of playing
        if ($primaryHand.attr('id') && $primaryHand.attr('id') !== 'player-hand') {
          $(this).attr({'id': $primaryHand.attr('id')});
          $primaryHand.attr({'id': ''});
          $(this).addClass('occupied');
          $primaryHand.removeClass('occupied');
          $(this).append($primaryHand.children())
          $primaryHand.children().remove();
          $(this).prev().append($primaryHand.prev().children());
          $primaryHand.prev().children().remove();
        }
      };
    })
    if ($primaryHand.attr('id') === leftPlayer.id) {
      $primaryHand.attr({'id': ''});
      $primaryHand.removeClass('occupied');
      $primaryHand.children().remove();
    }
  }
}

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

// ACCEPTS THE BET INPUT AND SENDS BET TO THE SERVER ONLY IF PLAYER BETS BETWEEN 1 AND ALL OF THEIR MONEY
function setBet(betAmount) {
  let $messageBox = $('#message');
  if (betAmount > 0 && betAmount <= player.money) {
    player.bet = betAmount;
    player.money -= player.bet;
    $('#player-money p').text(`$${centify(player.money)}`);
    $('#player-bet p').text(`$${player.bet}`);

    socket.emit('place bet', {name: player.name, bet: player.bet});

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

// 'deal cards' RECEIVES THE INITIAL DEALT CARD DATA
socket.on('deal cards', function(data) {
  // 'data' is players, dealer
  data.players.forEach((serverPlayer) => {
    if (serverPlayer.id === socket.id) {
      player.hand = serverPlayer.hand;
      player.total = serverPlayer.total;
    }
  })
  dealCards(data.players, data.dealer);
  console.log(data.players);
  console.log(data.dealer);
});

// RENDERS THE INITIAL TWO CARDS FOR ALL PLAYERS (and maybe TESTS FOR BLACKJACK)
function dealCards(players, dealer) {
  // console.log('deal em out!');

  let $messageBox = $('#message');
  let $dealButton = $('#deal-button');

  $('.hand').children().remove();
  $messageBox.text('Dealing \'em out!');

  players.forEach((serverPlayer) => {
    if (serverPlayer.id === socket.id) {
      player.hand.forEach((card) => {
        let $newCard = ($('<div>', {'class': 'card removed'}));
        $newCard.css('background-image', `url('${card.img}')`);
        $('#player-hand').append($newCard);
      });
      $('#player-total p').text(player.total);
    } else {
      serverPlayer.hand.forEach((card) => {
        let $newCard = ($('<div>', {'class': 'card removed'}));

        $newCard.css('background-image', `url('${card.img}')`);

        $newCard.attr('id', `${serverPlayer.id}-card-${serverPlayer.hand.length}`);
        $(`#${serverPlayer.id}`).append($newCard);
        $newCard.removeClass('removed');
        $newCard.removeClass('hidden');
        $newCard.addClass('flyin');
      })
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

  for (let i = 1; i <= dealer.length; i++) {
    setTimeout(function() {
      $(`#dealer-hand div:nth-child(${i})`).removeClass('hidden');
      $(`#dealer-hand div:nth-child(${i})`).addClass('flyin');
    }, timeout);
    timeout += 250;
  };

  for (let i = 1; i <= player.hand.length; i++) {
    setTimeout(function() {
      $(`#player-hand div:nth-child(${i})`).removeClass('hidden');
      $(`#player-hand div:nth-child(${i})`).addClass('flyin');
    }, timeout);
    timeout += 250;
  };

  players.forEach((otherPlayer) => {
    for (let i = 1; i <= otherPlayer.hand.length; i++) {
      setTimeout(function() {
        $(`#${otherPlayer.id} div:nth-child(${i})`).removeClass('hidden');
        $(`#${otherPlayer.id} div:nth-child(${i})`).addClass('flyin');
      }, timeout);
    timeout += 250;
    }
  });

  //** MAYBE MAKE THIS SERVER-SIDE */
  // tests if either player or dealer gets Blackjack (21 with two cards)
  // ends the game if so, resumes game if not
  if ($('.primary').attr('id') === 'player-hand') {
    setTimeout(function () {
      $('#player-box').removeClass('hidden');
      $('#hit-button').text('HIT');
      $('#hit-button').removeClass('removed');
      $('#stand-button').text('STAND');
      $('#stand-button').removeClass('removed');
      socket.emit('player ready');
      // if(testForBlackjack()) {
      //   endGame();
      // } else {
      //   startGame();
      // };
    }, timeout);
  }

};

// DISPLAYS APPROPRIATE MESSAGE IF PLAYER OR DEALER GETS BLACKJACK (21 with two cards)
//** MAYBE MOVE THIS SERVER-SIDE */
// function testForBlackjack() {
//   // console.log('checking for blackjack...');

//   let $messageBox = $('#message');

//   if (player.total === 21 && dealer.total === 21) {
//     pushMoney(player);
//     $messageBox.html('PUSH!');
//     return true;
//   } else if (player.total === 21) {
//     winMoney(player, (3/2));
//     $messageBox.html(`Blackjack pays 3:2!</p>You win $${centify(player.bet * (3/2))}!`);
//     return true;
//   } else if (dealer.total === 21) {
//     $messageBox.html('Dealer has blackjack!<br/>Dealer wins.');
//     return true;
//   };
// };

// 'your turn' IS THE SERVER NOTIFYING PLAYER IT IS THEIR TURN
// ACTIVATES THEIR HIT/STAND BUTTONS
socket.on('your turn', function() {
  console.log('my turn!');
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');

  $hitButton.removeClass('subdued');
  $standButton.removeClass('subdued');

  $hitButton.on('click', function() {
    console.log('hit me!');
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

// 'new card' RECEIVES NEW CARD DATA WHEN A PLAYER (ANY PLAYER) HITS
socket.on('new card', function(data) {
  hitMe(data.player, data.card, data.total);
})

// ADDS A CARD TO THE INDICATED PLAYER'S HAND, (will eventually) UPDATES PLAYER TOTAL
function hitMe(recipient, card, total) {
  // console.log(`${turn.name} hits!`);
  let $newCard = ($('<div>', {'class': 'card removed'}));

  $newCard.css('background-image', `url('${card.img}')`);

  if (recipient.id === socket.id) {
    player.hand.push(card);
    player.total = total;
    $(`#player-total p`).text(total);
    $newCard.attr('id', `player-card-${player.hand.length}`);
    $(`#player-hand`).append($newCard);
  } else {
    $newCard.attr('id', `${recipient.id}-card-${recipient.hand.length}`);
    $(`#${recipient.id}`).append($newCard);
  }

  $newCard.removeClass('removed');
  $newCard.addClass('flyin');

};

// 'turn over' IS THE SERVER LETTING YOU KNOW YOU BUSTED
socket.on('turn over', function() {
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');

  $hitButton.addClass('subdued');
  $standButton.addClass('subdued');

  $hitButton.off('click');
  $standButton.off('click');

  if (player.total > 21) {
    $('#message').html('<p>BUSTED</p>');
    //player.bet = 0;
    $('#player-bet p').html('$0');
    localStorage.setItem('playerMoney', player.money);
  }
});

// 'new dealer card' IS LIKE 'hitMe', BUT FOR THE DEALER
socket.on('new dealer card', function(data) {
  let timeout = 0;
  let $newCard = ($('<div>', {'class': 'card removed'}));
  $newCard.css('background-image', `url('${data.card.img}')`);
  $(`#dealer-hand`).append($newCard);
  setTimeout(function() {
    $newCard.removeClass('removed');
    $newCard.addClass('flyin');
  }, timeout);
});

// RETURNS INDICATED PLAYER'S TOTAL VALUE OF THEIR HAND
//** MOVED TO SERVER SIDE, WILL LIKELY DELETE */
// function calculateHand(turn) {
//   //console.log(`calculating ${turn.name} hand total...`);
//   return turn.hand.reduce((total, card) => {
//     return total += card.realValue;
//   }, 0);

// };

// ADDS 10 TO PLAYER'S TOTAL IF THEY HAVE AN ACE AND IT WON'T PUT THEM OVER 21
// DISPLAYS BOTH POSSIBLE TOTALS
//** MOVED TO SERVER SIDE, WILL LIKELY DELETE */
// function checkForAce(turn) {
//   if (hasAce(turn) && (turn.total + 10 <= 21)) {
//     $(`#${turn.name}-total p`).text(`${turn.total} (${turn.total + 10})`)
//     turn.total += 10;
//   };

// };

// RETURNS WHETHER THE INDICATED PLAYER HAS AN ACE IN THEIR HAND
//** MOVED TO SERVER SIDE, WILL LIKELY DELETE */
// function hasAce(turn) {
//   let hasAce = false;

//   turn.hand.forEach ((card) => {
//     if (card.value === 'A') {
//       hasAce = true;
//     };
//   });

//   return hasAce;
// };

// 'game over' LETS PLAYERS KNOW THAT THE GAME IS OVER
socket.on('game over', function(data) {
  // 'data' is dealerHiddenCard, dealerTotal, status, message
  endGame(data.dealerHiddenCard, data.dealerTotal, data.status, data.message);
});

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

  $hitButton.off('click');
  $hitButton.addClass('subdued');

  $standButton.off('click');
  $standButton.addClass('subdued');

  if (winStatus) {
    // players get win statuses, so if user is a player, gives them their money, resets their bet, 
    // and gives them the option to either play another game or bow out
    if (winStatus === 'win') {
      player.money += player.bet * 2;
      //player.bet = 0;
      $('#player-bet p').html('$0');
      $('#player-money p').text(`$${centify(player.money)}`);
      localStorage.setItem('playerMoney', player.money);
    } else if (winStatus === 'push') {
      player.money += player.bet;
      //player.bet = 0;
      $('#player-bet p').html('$0');
      $('#player-money p').text(`$${centify(player.money)}`);
      localStorage.setItem('playerMoney', player.money);
    } else if (winStatus === 'lose') {
      //player.bet = 0;
      $('#player-bet p').html('$0');
      $('#player-money p').text(`$${centify(player.money)}`);
      localStorage.setItem('playerMoney', player.money);
    }  

    // buttons to let players opt to play again or not
    $hitButton.removeClass('subdued');
    $standButton.removeClass('subdued');
    $hitButton.text("I'M IN");
    $standButton.text("I'M OUT");
    $hitButton.one('click', resetGame);
    $standButton.one('click', leaveGame);
  
  } else {
    // for everyone who's not a player, give them the option to join as a player...
    let $sitButton = $('<button>', {id: 'sit-button', style: 'align-self: flex-start; margin-top: 10px;'}).text('SIT');

    if(!$('.primary').attr('id')) {
      $('.primary').append($sitButton);
    }

    $('#sit-button').on('click', function() {
      socket.emit('deal me in', {name: player.name});

      $('.hand').children().remove();
      $('#message').text(' ');
      $('#player-box').addClass('hidden');
      $('#dealer-box').addClass('hidden');
      $('#money-box').children().removeClass('hidden');
      $('.primary').attr({'id': 'player-hand'});

      $sitButton.remove();
      
      placeBet();
    })
  }

  $messageBox.html(`<p>${message}</p>`)
  $('#dealer-total p').text(dealerTotal);
  $('#dealer-box').removeClass('hidden');

};

// DISPLAYS 2 DIGITS IF PLAYER HAS DOLLARS AND CENTS
function centify(amount) {
  if (amount % 1) {
    return amount.toFixed(2);
  } else {
    return amount;
  }
};

// 'reset board' IS THE SERVER TELLING THE USERS TO CLEAR THE BOARD
socket.on('reset board', function() {
  resetBoard();
});

function resetBoard() {
  $('.hand').children().remove();
  $('.hand').prev().children().remove();
  $('#message').text(' ');
  $('#player-box').addClass('hidden');
  $('#dealer-box').addClass('hidden');
}

// RESETS GAME & RESTARTS IF PLAYER STILL HAS MONEY
function resetGame() {
  
  resetBoard();
  
  player.hand = [];
  dealer.hand = [];

  if($('.primary').attr('id') === 'player-hand' && player.money > 0) {
    $('#button-bar').children().addClass('removed');
    $('#button-bar').children().addClass('subdued');
    $('#button-bar').children().off('click');
    placeBet(player);
  } else {
    $('#message').text('You\'re outta cash! Get outta here, ya bum!');
    leaveGame();
  };

};

// PLAYER LEAVES GAME
function leaveGame() {
  socket.emit('leave game');

  player.hand = [];
  dealer.hand = [];

  $('.hand').children().remove();
  $('#player-hand').attr({'id': ''});
  $('#message').text(' ');
  $('#player-box').addClass('hidden');
  $('#dealer-box').addClass('hidden');
  $('#money-box').children().addClass('hidden');
  $('#button-bar').children().addClass('removed');
  $('#button-bar').children().addClass('subdued');
  $('#button-bar').children().off('click');
}


inputName();
//setUpTable();


//** HERE ARE THE CHAT SOCKET INTERACTIONS **//

socket.on('new message', function(data) {
  // 'data' is name, id (socket.id), text
  let $name = $('<span>', {'class': 'chat-username'}).text(`${data.name}: `);
  let $text = $('<span>', {'class': 'chat-text'}).text(data.text);
  let $message = $('<p>', {'class': 'chat-message'}).append($name).append($text);

  $('#chat-messages').prepend($message);
});

socket.on('user left', function(data) {
  let $name = $('<span>', {'class': 'chat-username'}).text(`::: `);
  let $text = $('<span>', {'class': 'chat-text'}).text(`${data.user.name} left`);
  let $message = $('<p>', {'class': 'notification', 'id': 'user-left-notification'}).append($name).append($text);

  $('#chat-messages').prepend($message);
});

socket.on('list users', function(data) {
  let $userList = $('<p>', {'class': 'notification', 'id': 'user-list-notification'});
  if (jQuery.isEmptyObject(data.users)) {
    $userList.text('You\'re all alone and that\'s sad :(');
  } else {
    let userList = '';
    data.users.forEach((user) => {
      userList += ` -${user.name}`;
    });
    $userList.text(`You're with${userList}`);
  }

  $('#chat-messages').prepend($userList);
});

});
