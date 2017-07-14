$(document).ready(function() {
console.log('main.js loaded');

let player = {name: 'player', hand: [], money: 250};
let dealer = {name: 'dealer', hand: []};
let deck = [];
let bet = 0;

var Card = function(suit,value,realValue) {
  this.suit = suit;
  this.value = value;
  this.realValue = realValue;
  this.img = `./assets/Playing-Cards/${value}_of_${suit}.png`;
};

deck = shuffleDeck();

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

function dealHand() {
  console.log('deal em out!');

  let $messageBox = $('#message');

  $messageBox.text('Dealing \'em out!');

  hitMe(dealer);
  hitMe(dealer);
  hitMe(player);
  hitMe(player);

  $('#dealer-hand div:nth-child(1)').css('background-image', 'url("./assets/card-back.jpg")');

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

  setTimeout(function () {
    $('#player-box').removeClass('hidden');
    if(testForBlackjack()) {
      endGame();
    } else {
      startGame();
    };
  }, timeout);

};

function testForBlackjack() {
  // console.log('checking for blackjack...');

  let $messageBox = $('#message');

  if (player.total === 21 && dealer.total === 21) {
    console.log('Both player and dealer have 21, PUSH');
    $messageBox.text('PUSH!');
    return true;
  } else if (player.total === 21) {
    console.log('Player has blackjack. Player wins.');
    $messageBox.text('BLACKJACK! You win!');
    return true;
  } else if (dealer.total === 21) {
    console.log('Dealer has blackjack. Dealer wins.');
    $messageBox.text('Dealer has blackjack! Dealer wins.');
    return true;
  };
};

function hitMe(turn) {
  console.log(`${turn.name} hits!`);

  let $newCard = ($('<div>', {'class': 'card removed'}));
  let newCard = deck.shift();
  $newCard.css('background-image', `url('${newCard.img}')`);

  turn.hand.push(newCard);
  turn.$hand.append($newCard);

  turn.total = calculateHand(turn);

  $(`#${turn.name}-total p`).text(turn.total);

  checkForAce(turn);

  //console.log(turn.name + ' total: ' + turn.total);
};

function calculateHand(turn) {
  //console.log(`calculating ${turn.name} hand total...`);

  return turn.hand.reduce((total, card) => {
    return total += card.realValue;
  }, 0);

};

function checkForAce(turn) {

  if (hasAce(turn) && (turn.total + 10 <= 21)) {
    $(`#${turn.name}-total p`).text(`${turn.total} (${turn.total + 10})`)
    turn.total += 10;
  };

};

function hasAce(turn) {
  let hasAce = false;

  turn.hand.forEach ((card) => {
    if (card.value === 'A') {
      hasAce = true;
    };
  });

  return hasAce;
};

function startGame() {
  console.log('game begins!');
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  let $dealButton = $('#deal-button');

  $('#message').text(' ');

  $dealButton.addClass('subdued');
  $dealButton.off('click');

  $hitButton.removeClass('subdued');
  $hitButton.on('click', function() {
    hitMe(player);
    $('#player-hand div:last-child').removeClass('removed');
    $('#player-hand div:last-child').addClass('flyin');
    if (testForBust(player)){
      checkWinConditions();
    };
  });

  $standButton.removeClass('subdued');
  $standButton.on('click', function() {
    dealerTurn();
  });

};

function dealerTurn() {
  $('#hit-button').off('click');
  $('#hit-button').addClass('subdued');
  $('#stand-button').off('click');
  $('#stand-button').addClass('subdued');

  let timeout = 0;

  while (dealer.total < 17) {
    hitMe(dealer);
  };

  for(let i = 2; i <= dealer.hand.length; i++) {
    setTimeout(function() {
      $(`#dealer-hand div:nth-child(${i})`).removeClass('removed');
      $(`#dealer-hand div:nth-child(${i})`).addClass('flyin');
    }, timeout);
    timeout += 250;
  }

  setTimeout(function() {
    checkWinConditions();
  }, timeout + 250);

};

function checkWinConditions() {
  let $messageBox = $('#message');

  setTimeout(function () {
  if (testForBust(player)) {
    $messageBox.text('BUST!');
  } else if (testForBust(dealer)) {
    $messageBox.text('Dealer busts! YOU WIN!');
  } else if (dealer.total === player.total) {
    $messageBox.text('PUSH!');
  } else if (dealer.total > player.total) {
    $messageBox.text('Dealer wins.');
  } else if (dealer.total < player.total) {
    $messageBox.text('YOU WIN!!');
  };

  }, 1000);

  endGame();
};

function testForBust(turn) {
  return turn.total > 21;
};

function endGame() {
  console.log('game finished!');

  let $messageBox = $('#message');
  let $dealButton = $('#deal-button');
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  let $dealerFirstCard = $('#dealer-hand div:nth-child(1)')

  $dealerFirstCard.removeClass('flyin');
  $dealerFirstCard.addClass('loop');
  setTimeout(function() {
    // $dealerFirstCard.removeClass('flipout');
    // $dealerFirstCard.addClass('flipin');
    $('#dealer-box').removeClass('hidden');
    $dealerFirstCard.css('background-image', `url(${dealer.hand[0].img}`);
  }, 500);

  $hitButton.off('click');
  $hitButton.addClass('subdued');

  $standButton.off('click');
  $standButton.addClass('subdued');

  $dealButton.removeClass('subdued');
  $dealButton.text('DEAL AGAIN');
  $dealButton.one('click', resetGame);
};

function resetGame() {
  $('.hand').children().remove();
  $('.button').toggleClass('subdued');
  $('#deal-button').text('DEAL');
  $('#message').text(' ');
  $('#player-box').addClass('hidden');
  $('#dealer-box').addClass('hidden');
  player.hand = [];
  dealer.hand = [];

  if(deck.length < 10) {
    deck = shuffleDeck();
  }

  dealHand();
};

function setUpTable () {
  console.log('setting up table!');
  let $cardTable = ($('<div>', {'class': 'container', 'id': 'card-table'}));
  let $dealerHand = ($('<div>', {'class': 'hand', 'id': 'dealer-hand'}));
  let $playerHand = ($('<div>', {'class': 'hand', 'id': 'player-hand'}));
  let $banner = ($('<div>', {'class': 'banner'}));
  let $buttons = ($('<div>', {'id': 'button-bar'}));
  let $playerTotal = ($('<div>', {'class': 'text-box hidden', 'id': 'player-box'})).html('<span id="player-total">Player Total <p>0</p> </span>');
  let $messageBox = ($('<div>', {'class': 'text-box', 'id': 'message-box'})).html('<span id="message">Welcome to Blackjack!</span>');
  let $dealerTotal = ($('<div>', {'class': 'text-box hidden', 'id': 'dealer-box'})).html('<span id="dealer-total">Dealer Total <p>0</p> </span>');
  let $dealButton = ($('<button>', {'class': 'button', 'id': 'deal-button'})).text('DEAL');
  let $hitButton = ($('<button>', {'class': 'button subdued', 'id': 'hit-button'})).text('HIT');
  let $standButton = ($('<button>', {'class': 'button subdued', 'id': 'stand-button'})).text('STAND');

  $('body').append($cardTable);
  $('#card-table').append($dealerHand);
  $('#card-table').append($banner);
  $('.banner').append($playerTotal);
  $('.banner').append($messageBox);
  $('.banner').append($dealerTotal);
  $('#card-table').append($buttons);
  $('#button-bar').append($dealButton);
  $('#button-bar').append($hitButton);
  $('#button-bar').append($standButton);
  $('#card-table').append($playerHand);

  $('#deal-button').on('click', dealHand);
  player.$hand = $('#player-hand');
  dealer.$hand = $('#dealer-hand');
};

setUpTable();


});
