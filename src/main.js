$(function() {
console.log('main.js loaded');

let deck = [];

var Card = function(suit,value,realValue) {
  this.suit = suit;
  this.value = value;
  this.realValue = realValue;
  this.img = `./assets/Playing-Cards/${value}_of_${suit}.png`;
};

function createDeck() {
  let suits = ['spades', 'clubs', 'hearts', 'diamonds'];
  let values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

  suits.forEach((suit) => {
    for (let i = 0; i < values.length; i++) {
      let card = new Card(suit, values[i], (i+1));
      deck.push(card);
    };
  });
  // console.log(deck);
};

function shuffleDeck(deck) {
  let deckSize = deck.length;
  let sourceDeck = deck;
  let shuffleDeck = [];
  let randIndex;

  for(let i = 0; i < deckSize; i++) {
    randIndex = Math.floor(Math.random() * sourceDeck.length);
    shuffleDeck.push(sourceDeck.splice(randIndex, 1)[0]);
  };
  // console.log(shuffleDeck);
  return shuffleDeck;
};

createDeck();
shuffleDeck(deck);



});
