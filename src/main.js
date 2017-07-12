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
    for (let i = 0; i < values.length; i++) {
      let card = new Card(suit, values[i], realValues[i]);
      deck.push(card);
    };
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
    // if (card.value === 'A') {
    //   hasAce = true;
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

  console.log(deck.length);
  console.log(dealTo.name + ' hand: ' + dealTo.hand);

  console.log(dealTo.name + ' total: ' + calculateHand(dealTo));
}

function dealHand() {
  console.log('deal em out!');
  let deck = shuffleDeck();
  hitMe(deck, dealer);
  hitMe(deck, dealer);
  hitMe(deck, player);
  hitMe(deck, player);

  startGame(deck);

};

function startGame(deck) {
  console.log('game begins!');
  $('#deal-button').off('click');
  $('#hit-button').on('click', function() {
    hitMe(deck, player);
  });
  $('#stand-button').on('click', function() {
    endGame(deck);
  });


};

function endGame(deck) {
  $('#hit-button').off('click');
  $('#stand-button').off('click');
  console.log('game finished!');
}

function setUpTable () {
  console.log('setting up table!');
  let $cardTable = ($('<div>', {'class': 'container', 'id': 'card-table'}));
  let $dealerHand = ($('<div>', {'class': 'hand', 'id': 'dealer-hand'}));
  //let $dealerCardOne = ($('<div>', {'class': 'card flipped'}));
  //let $dealerCardTwo = ($('<div>', {'class': 'card unflipped'}));
  let $playerHand = ($('<div>', {'class': 'hand', 'id': 'player-hand'}));
  //let $playerCardOne = ($('<div>', {'class': 'card unflipped'}));
  //let $playerCardTwo = ($('<div>', {'class': 'card unflipped'}));
  let $messageBox = ($('<div>', {'class': 'banner', 'id': 'message-box'})).html('<span id="message">This is a message box!</span>');
  let $dealButton = ($('<button>', {'class': 'button', 'id': 'deal-button'})).text('DEAL');
  let $hitButton = ($('<button>', {'class': 'button hidden', 'id': 'hit-button'})).text('HIT');
  let $standButton = ($('<button>', {'class': 'button hidden', 'id': 'stand-button'})).text('STAND');

  $('body').append($cardTable);
  $('#card-table').append($dealerHand);
  $('#card-table').append($messageBox);
  $('#card-table').append($dealButton);
  $('#card-table').append($hitButton);
  $('#card-table').append($standButton);
  $('#card-table').append($playerHand);
  //$('#dealer-hand').append($dealerCardOne);
  //$('#dealer-hand').append($dealerCardTwo);
  //$('#player-hand').append($playerCardOne);
  //$('#player-hand').append($playerCardTwo);

  $('#deal-button').on('click', dealHand);
  player.$hand = $('#player-hand');
  dealer.$hand = $('#dealer-hand');
};

setUpTable();


});
