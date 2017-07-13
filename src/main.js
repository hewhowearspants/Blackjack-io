$(document).ready(function() {
console.log('main.js loaded');

let player = {name: 'player', hand: []};
let dealer = {name: 'dealer', hand: []};

var Card = function(suit,value,realValue) {
  this.suit = suit;
  this.value = value;
  this.realValue = realValue;
  this.img = `./assets/Playing-Cards/${value}_of_${suit}.png`;
};

function createDeck() {
  let suits = ['spades', 'clubs', 'hearts', 'diamonds'];
  let values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  let realValues = [1,2,3,4,5,6,7,8,9,10,10,10,10]
  let deck = [];

  suits.forEach((suit) => {
    values.forEach((value, index) => {
      let card = new Card(suit, value, realValues[index]);
      deck.push(card);
    });
  });

  // console.log(deck);
  return deck;
};

function shuffleDeck() {
  console.log('shuffling deck...')

  let deck = createDeck();
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

  let $messageBox = $('#message-box');
  let deck = shuffleDeck();

  hitMe(deck, dealer);
  $('#dealer-hand div:nth-child(1)').css('background-image', 'url("./assets/card-back.jpg")');
  hitMe(deck, dealer);
  hitMe(deck, player);
  hitMe(deck, player);

  $('.hand').children().addClass('hidden');

  var timeout = 0;

  for (let i = 1; i < 3; i++) {
    setTimeout(function () {
      $(`#dealer-hand div:nth-child(${i})`).removeClass('hidden');
    }, timeout);
    timeout += 250;
  };

  for (let i = 1; i < 3; i++) {
    setTimeout(function () {
      $(`#player-hand div:nth-child(${i})`).removeClass('hidden');
    }, timeout);
    timeout += 250;
  };

  setTimeout(function () {
    if(testForBlackjack()) {
      endGame();
    } else {
      startGame(deck);
    };
  }, 1000);

};

function testForBlackjack() {
  console.log('checking for blackjack...');

  let $messageBox = $('#message-box');

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

function hitMe(deck, turn) {
  console.log('hit me!');

  let $newCard = ($('<div>', {'class': 'card'}));
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
  console.log(`calculating ${turn.name} hand total...`);

  return turn.hand.reduce((total, card) => {
    return total += card.realValue;
  }, 0);

};

function checkForAce(turn) {
  console.log('checking for ace...');

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

function startGame(deck) {
  console.log('game begins!');
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  let $dealButton = $('#deal-button');

  $dealButton.addClass('subdued');
  $dealButton.off('click');

  $hitButton.removeClass('subdued');
  $hitButton.on('click', function() {
    hitMe(deck, player);
    if (testForBust(player)){
      checkWinConditions();
    };
  });

  $standButton.removeClass('subdued');
  $standButton.on('click', function() {
    dealerTurn(deck);
  });

};

function dealerTurn(deck) {
  $('#hit-button').off('click');
  $('#hit-button').addClass('subdued');
  $('#stand-button').off('click');
  $('#stand-button').addClass('subdued');

  while (dealer.total < 16) {
    setTimeout(function() {
      hitMe(deck, dealer);
    }, 250);
  };

  checkWinConditions();

};

function checkWinConditions() {
  let $messageBox = $('#message-box');

  $('#dealer-hand div:nth-child(1)').css('background-image', `url(${dealer.hand[0].img}`);

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

  endGame();
};

function testForBust(turn) {
  return turn.total > 21;
};

function endGame() {
  console.log('game finished!');

  let $messageBox = $('#message-box');
  let $dealButton = $('#deal-button');
  let $hitButton = $('#hit-button')
  let $standButton = $('#stand-button')

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
  $('#message-box').text(' ');
  player.hand = [];
  dealer.hand = [];

  dealHand();
};

function setUpTable () {
  console.log('setting up table!');
  let $cardTable = ($('<div>', {'class': 'container', 'id': 'card-table'}));
  let $dealerHand = ($('<div>', {'class': 'hand', 'id': 'dealer-hand'}));
  let $playerHand = ($('<div>', {'class': 'hand', 'id': 'player-hand'}));
  let $banner = ($('<div>', {'class': 'banner'}));
  let $playerTotal = ($('<div>', {'class': 'text-box', 'id': 'player-box'})).html('<span id="player-total">Player Total: <p>0</p> </span>');
  let $messageBox = ($('<div>', {'class': 'text-box', 'id': 'message-box'})).html('<span id="message">Welcome to Blackjack!</span>');
  let $dealerTotal = ($('<div>', {'class': 'text-box', 'id': 'dealer-box'})).html('<span id="dealer-total">Dealer Total: <p>0</p> </span>');
  let $dealButton = ($('<button>', {'class': 'button', 'id': 'deal-button'})).text('DEAL');
  let $hitButton = ($('<button>', {'class': 'button subdued', 'id': 'hit-button'})).text('HIT');
  let $standButton = ($('<button>', {'class': 'button subdued', 'id': 'stand-button'})).text('STAND');

  $('body').append($cardTable);
  $('#card-table').append($dealerHand);
  $('#card-table').append($banner);
  $('.banner').append($playerTotal);
  $('.banner').append($messageBox);
  $('.banner').append($dealerTotal);
  $('#card-table').append($dealButton);
  $('#card-table').append($hitButton);
  $('#card-table').append($standButton);
  $('#card-table').append($playerHand);

  $('#deal-button').on('click', dealHand);
  player.$hand = $('#player-hand');
  dealer.$hand = $('#dealer-hand');
};

setUpTable();


});
