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
  let deck = createDeck();
  let deckSize = deck.length;
  let shuffleDeck = [];
  let randIndex;

  for(let i = 0; i < deckSize; i++) {
    randIndex = Math.floor(Math.random() * deck.length);
    shuffleDeck.push(deck.splice(randIndex, 1)[0]);
  };
  console.log('deck shuffled!');
  return shuffleDeck;
};

function testOver21(handTotal) {
  return handTotal > 21
}

function calculateHand(dealTo) {
  // let hasAce;

  let handTotal = dealTo.hand.reduce((total, card) => {
    // if (card.value === 'A' && ((total + 11) <= 21)) {
    //   card.realValue = 11;
    // };
    return total += card.realValue;
  }, 0);

  // if (hasAce) {
  //   return [handTotal, handTotal + 10];
  // } else {
    return handTotal;
  //};
};

function hitMe(deck, dealTo) {
  console.log('hit me!');
  let $newCard = ($('<div>', {'class': 'card unflipped'}));
  let newCard = deck.shift();
  $newCard.css('background-image', `url('${newCard.img}')`);

  dealTo.hand.push(newCard);
  dealTo.$hand.append($newCard);

  dealTo.total = calculateHand(dealTo);

  if (testOver21(dealTo.total)) {
    endGame();
  };

  //console.log(deck.length);
  $('#message-box').text(`${dealTo.name}: ${dealTo.total}`);
  console.log(dealTo.name + ' total: ' + dealTo.total);
}

function dealHand() {
  console.log('deal em out!');
  let $messageBox = $('#message-box');
  let deck = shuffleDeck();

  hitMe(deck, dealer);
  hitMe(deck, dealer);
  hitMe(deck, player);
  hitMe(deck, player);

  if (player.total === 21 && dealer.total === 21) {
    $messageBox.text('PUSH!');
    endGame();
  } else if (player.total === 21) {
    $messageBox.text('BLACKJACK! You win!');
    endGame();
  } else if (dealer.total === 21) {
    $messageBox.text('Dealer has blackjack! Dealer wins.');
    endGame();
  }

  //console.log(`${dealer.name} hand: ${JSON.stringify(dealer.hand)}`);
  console.log(`${dealer.name} total: ${dealer.total}`);
  //console.log(`${player.name} hand: ${JSON.stringify(player.hand)}`);
  console.log(`${player.name} total: ${player.total}`);

  startGame(deck);

};

function dealerTurn(deck) {
  $('#hit-button').off('click');
  $('#hit-button').addClass('subdued');
  $('#stand-button').off('click');
  $('#stand-button').addClass('subdued');

  if (player.total < 21) {
    while (dealer.total < 16) {
      hitMe(deck, dealer);
    };
  };

  endGame();
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
  });

  $standButton.removeClass('subdued');
  $standButton.on('click', function() {
    dealerTurn(deck);
  });

};

function endGame() {
  let $messageBox = $('#message-box');
  let $dealButton = $('#deal-button');
  $('#hit-button').off('click');
  $('#hit-button').addClass('subdued');
  $('#stand-button').off('click');
  $('#stand-button').addClass('subdued');

  if (player.total > 21) {
    $messageBox.text('BUST!');
  } else if (dealer.total > 21) {
    $messageBox.text('Dealer busts! YOU WIN!');
  } else if (dealer.total === player.total) {
    $messageBox.text('PUSH!');
  } else if (dealer.total > player.total) {
    $messageBox.text('Dealer wins.')
  } else if (player.total > dealer.total) {
    $messageBox.text('YOU WIN!!');
  };

  $dealButton.removeClass('subdued');
  $dealButton.text('DEAL AGAIN');
  $dealButton.one('click', resetGame);
  console.log('game finished!');
}

function resetGame() {
  $('.hand').children().remove();
  $('.button').toggleClass('subdued');
  $('#deal-button').text('DEAL');
  $('').text(' ');
  player.hand = [];
  dealer.hand = [];

  dealHand();
};

function setUpTable () {
  console.log('setting up table!');
  let $cardTable = ($('<div>', {'class': 'container', 'id': 'card-table'}));
  let $dealerHand = ($('<div>', {'class': 'hand', 'id': 'dealer-hand'}));
  let $playerHand = ($('<div>', {'class': 'hand', 'id': 'player-hand'}));
  let $messageBox = ($('<div>', {'class': 'banner', 'id': 'message-box'})).html('<span id="message">This is a message box!</span>');
  let $dealButton = ($('<button>', {'class': 'button', 'id': 'deal-button'})).text('DEAL');
  let $hitButton = ($('<button>', {'class': 'button subdued', 'id': 'hit-button'})).text('HIT');
  let $standButton = ($('<button>', {'class': 'button subdued', 'id': 'stand-button'})).text('STAND');

  $('body').append($cardTable);
  $('#card-table').append($dealerHand);
  $('#card-table').append($messageBox);
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
