$(document).ready(function() {
console.log('main.js loaded');

let deck = [];
let playerWallet = parseInt(localStorage.getItem('playerMoney')) || 1000;
let playerName = localStorage.getItem('playerName') || 'player';
let player = {name: playerName, hand: [], money: playerWallet, bet: 0, splitHand: null};
let dealer = {name: 'dealer', hand: []};
let users = [];
let players = [];
var socket = io({query: {
  name: player.name,
  hand: player.hand,
  bet: player.bet,
}});

var playSound = false;

var chipSound = document.createElement('audio');
chipSound.setAttribute('src', '../sounds/chip.wav');

// plays a random card sound for the indicated action
function playCardSound(action) {
  if (action === 'slide') {
    var randNum = Math.ceil(Math.random() * 8);
    var fileType = '.wav';
  } else if (action === 'flip') {
    var randNum = Math.ceil(Math.random() * 3);
    var fileType = '.mp3';
  }

  action = action.charAt(0).toUpperCase() + action.slice(1);

  var cardSound = document.createElement('audio');
  cardSound.setAttribute('src', `../sounds/card${action}${randNum}${fileType}`);

  if (cardSound.paused) {
    cardSound.play();
  } else {
    cardSound.currentTime = 0;
  }
}

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
  let $inputName = $('<input>', {'type': 'text', 'id': 'input-name', 'formmethod': 'post', 'size': '20', 'maxlength': '20', 'placeholder': 'who are you?'});
  let $submitName = $('<input>', {'type': 'submit', 'id': 'submit-name', 'value': 'GO'});
  $('body').append($inputName);
  //$('body').append($submitName);

  $inputName.keypress(function(event) {
    let name = $inputName.val();
    if (event.keyCode == 13 || event.which == 13) {
      if (name !== '') {
        player.name = name;
        $inputName.remove();
        $submitName.remove();
        // let server know there's a new user in town
        socket.emit('new user', { name: player.name });
        setUpTable();
      } else {
        $('#input-name').attr("placeholder", "enter a name!");
        setTimeout(function() {
          $('#input-name').attr('placeholder', 'who are you?');
        }, 1000);
      }
    };
  });

  $submitName.on('click', function() {
    let name = $inputName.val();
    if (name !== '') {
      player.name = name;
      $inputName.remove();
      $submitName.remove();
      // let server know there's a new user in town
      socket.emit('new user', { name: player.name });
      setUpTable();
    } else {
      $('#input-name-change').attr("placeholder", "enter a name!");
      setTimeout(function() {
        $('#input-name-change').attr('placeholder', 'change your name');
      }, 1000);
    }
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
  let $playerTotal = ($('<div>', {'class': 'text-box hidden', 'id': 'player-box'})).html(`<span id="player-total">${player.name} <p>0</p> </span>`);
  let $dealerTotal = ($('<div>', {'class': 'text-box hidden', 'id': 'dealer-box'})).html('<span id="dealer-total">Dealer <p>0</p> </span>');

  let $buttons = ($('<div>', {'id': 'button-bar'}));
  let $hitButton = ($('<button>', {'class': 'button removed subdued', 'id': 'hit-button'})).text('HIT');
  let $standButton = ($('<button>', {'class': 'button removed subdued', 'id': 'stand-button'})).text('STAND');
  let $doubleButton = ($('<button>', {'class': 'button removed subdued', 'id': 'double-button'})).text('DOUBLE');
  let $splitButton = ($('<button>', {'class': 'button removed subdued', 'id': 'split-button'})).text('SPLIT');

  let $menuButton = $('<div>', {'id': 'menu-button'}).html('<i class="fa fa-bars" aria-hidden="true"></i>');
  let $menuButtons = $('<div>', {'id': 'menu-buttons'}).slideUp();
  let $infoButton = $('<div>', {'id': 'info-button', 'class': 'menu-button selected'}).html('<i class="fa fa-question" aria-hidden="true"></i>');
  let $profileButton = $('<div>', {'id': 'profile-button', 'class': 'menu-button'}).html('<i class="fa fa-user" aria-hidden="true"></i>');
  let $quitButton = $('<div>', {'id': 'quit-button', 'class': 'menu-button'}).html('<i class="fa fa-sign-out" aria-hidden="true"></i>');
  let $soundButton = $('<div>', {'id': 'sound-button', 'class': 'menu-button'}).html('<i class="fa fa-volume-up" aria-hidden="true"></i>');

  let $profileGreeting = $('<p>', {'id': 'profile-greeting'}).html(`Hi, ${player.name}!<br/>Don't like being called ${player.name}?`);
  let $inputNameChange = $('<input>', {'type': 'text', 'id': 'input-name-change', 'formmethod': 'post', 'size': '20', 'maxlength': '20', 'placeholder': 'change your name'});
  let $submitNameChange = $('<input>', {'type': 'submit', 'id': 'submit-name-change', 'value': 'CHANGE'});

  let $infoPanelOverlay = $('<div>', {'id': 'info-panel-overlay', 'style': 'display: none'});
  let $infoPanel = $('<div>', {'id': 'info-panel'});
  let $infoContent = $('<p>', {'id': 'info-content', 'class': 'menu-content'});
  let $profileContent = $('<div>', {'id': 'profile-content', 'class': 'menu-content'}).hide();
  let $quitContent = $('<div>', {'id': 'quit-content', 'class': 'menu-content'}).html('<p>Do you want to quit?</p>').hide();
  let $soundContent = $('<div>', {'id': 'sound-content', 'class': 'menu-content'}).hide();
  let $quitConfirmButton = $('<button>', {'id': 'quit-confirm-button'}).text('QUIT');

  let $soundToggle = $('<div>', {'id': 'sound-toggle', 'class': 'sound-content'}).html('<p>SOUND: <span id="sound-toggle-on" class="sound-toggle">ON</span><span id="sound-toggle-off" class="sound-toggle selected">OFF</span></p>');
  let $musicPlayer = $('<div>', {'id': 'music-player', 'class': 'sound-content'}).html('<iframe width="100%" height="100%" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/359716067&amp;color=%23000000&amp;auto_play=false&amp;hide_related=true&amp;show_comments=false&amp;show_user=false&amp;show_reposts=false&amp;show_teaser=false"></iframe>');

  let $chatButton = $('<div>', {'id': 'chat-button'}).html('<i class="fa fa-comments" aria-hidden="true"></i>')
  let $chatContainer = $('<div>', {'id': 'chat-container'});
  let $chatContent = $('<div>', {'id': 'chat-content'});
  let $chatMessages = $('<div>', {'id': 'chat-messages'});
  let $chatForm = $('<form>', {'id': 'chat-form', 'action': ''});
  let $chatInput = $('<input>', {'id': 'chat-input', 'autocomplete': 'off'});
  let $chatSubmit = $('<button>', {'id': 'chat-submit'}).text('SEND');

  $credits = $('<div>', {'id': 'credits', 'class': 'info-content'}).html('<p>©2017 Ryan Edwards</p><p>Sounds from <a href="https://www.zapsplat.com">zapsplat.com</a> and <a href="http://kenney.nl/">kenney.nl</a></p>');
  $description = $('<div>', {'id': 'description', 'class':'info-content'}).html("<h2>What is Blackjack?</h2><br/><p>In Blackjack, players face off against the dealer. The dealer and the players each initially get two cards. The players can only see one of the dealer's cards. The cards are worth face value, except Aces and face cards (J, Q, K), which are 1 or 11 and 10, respectively.</p><br/>"
    +"<p>Each player's goal is to get the sum of their cards higher than the sum of the dealer's cards, without that sum going over 21 ('BUST'). To join a game, each player must bet an amount of money.</p><br/>"
    +"<p>After the initial two-card deal, if the dealer has a blackjack, meaning their two cards add up to 21 (meaning an ace and a 10/J/Q/K), the game is immediately over and everyone at the table who does not also have a blackjack loses. Players who do have blackjack get only their initial bet back ('PUSH'). If the dealer does not have a blackjack, players who do have blackjack automatically win, and even get paid out 1.5x on top of their original bet!</p><br/>"
    +"<p>If neither the dealer nor the player has a blackjack, the player then has up to four options:</p><br/>"
    +"<p>'HIT': The player requests additional cards if they want to increase their chances of beating the dealer. If the new card puts the player's total over 21 ('BUST'), their turn is automatically over.</p><br/>"
    +"<p>'DOUBLE DOWN': The player doubles their original bet and gets just one additional card. After this, their turn is over, whether or not they 'BUST'.</p><br/>"
    +"<p>'SPLIT': If the player's initial two cards have the same value (including 10s and face cards), they can split those two cards into two separate hands, each of which get an extra card. From there, the player plays each split hand separately. This also essentially doubles the player's bet, as each split hand has their own separate bet equal to the player's original bet.</p><br/>"
    +"<p>'STAND': When the player is satisfied, and has not gone over 21, they can end their turn.</p><br/>"
    +"<p>When each player has ended their turn, if sum of the dealer's hand is less than 17, the dealer will 'HIT' until their hand is worth 17 or higher, at which point, the dealer stands. If the dealer 'BUSTS', the players automatically win.</p><br/>"
    +"<p>After the dealer stands, the dealer's hidden card is revealed to the players, and if the sum of the player's hand is higher than the dealer's, the player wins. If they are equal, then it is a tie game, or 'PUSH'. If the dealer's is higher than the player's, the player loses.</p>"
    );

  $infoContent.append($credits).append($description);
  $profileContent.append($profileGreeting).append($inputNameChange).append($submitNameChange);
  $quitContent.append($quitConfirmButton);
  $soundContent.append($soundToggle).append($musicPlayer);

  $('body').append($cardTable);
  $('body').append($menuButton);
  $('body').append($chatContainer);
  $('body').append($chatButton);
  $('body').append($infoPanelOverlay);

  $menuButtons.append($infoButton).append($profileButton).append($soundButton).append($quitButton);
  $infoPanelOverlay.append($infoPanel);
  $infoPanel.append($infoContent);
  $infoPanel.append($profileContent);
  $infoPanel.append($quitContent);
  $infoPanel.append($soundContent);
  $infoPanel.fadeIn();
  $profileContent.fadeOut();


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
  $('#button-bar').append($splitButton);
  $('#button-bar').append($doubleButton);
  $('#button-bar').append($hitButton);
  $('#button-bar').append($standButton);

  $('#card-table').append($playersContainer);

  // sets up each hand container. comprised of two main parts, the user info and the hand itself
  for (let i = 1; i <= 5; i++) {
    let $handContainer = $('<div>', {'class': 'hand-container'});
    let $handUserInfo = $('<div>', {'class': 'hand-user-info'});
    let $handPlayerStats = $('<div>', {'class': 'hand-player-stats'});
    let $handPlayerMoney = $('<p>', {'class': 'hand-player-money hand-player-stat'});
    let $handPlayerBet = $('<p>', {'class': 'hand-player-bet hand-player-stat'});
    let $handPlayerTotal = $('<p>', {'class': 'hand-player-total hand-player-stat'});

    $handPlayerStats.append($handPlayerMoney).append($handPlayerBet).append($handPlayerTotal);

    $handUserInfo.append($('<p>', {'class': 'hand-player-name'}));
    $handUserInfo.append($handPlayerStats);

    $handContainer.append($handUserInfo);
    
    if (i === 3) {
      $handContainer.append($('<div>', {'class': 'hand primary'}));
    } else {
      $handContainer.append($('<div>', {'class': 'hand other'}));
    }
    $('#players-container').append($handContainer);
  }

  // ALL OF BELOW HANDLES THE MENU
  $('#menu-button').on('click', function() {
    if ($('#info-panel-overlay:visible').length === 0) {
      $('#menu-button').css({'color': 'rgba(255,255,255,0.5)'});
      //$('body').append($infoPanelOverlay);

      $infoPanelOverlay.fadeIn(250);
      $infoPanelOverlay.append($menuButtons);

      $menuButtons.slideDown(250, () => {
        $('#profile-button').on('click', function() {
          $('.menu-button').removeClass('selected');
          $(this).addClass('selected');
          $('.menu-content').fadeOut(1, function() {
            $profileContent.fadeIn(1);
          });
          $inputNameChange.keypress(function(event) {
            let name = $inputNameChange.val();

            if (event.keyCode == 13 || event.which == 13) {
              if (name !== '') { 
                player.name = name;
                $inputNameChange.val('');
                $('#profile-greeting').html(`Hi, ${player.name}!<br/>Don't like being called ${player.name}?`);
                $('#player-total').html(`${player.name} <p>${$('#player-total p').text()}</p>`);
                // let server know there's a new user in town
                socket.emit('name change', { name: player.name });
              } else {
                $('#input-name-change').attr("placeholder", "enter a name!");
                setTimeout(function() {
                  $('#input-name-change').attr('placeholder', 'change your name');
                }, 1000);
              }
            };
          });

          $submitNameChange.on('click', function() {
            let name = $inputNameChange.val();
            if (name !== '') {
              player.name = name;
              $inputNameChange.val('');
              $('#profile-greeting').html(`Hi, ${player.name}!<br/>Don't like being called ${player.name}?`);
              // let server know you've changed your name
              socket.emit('name change', { name: player.name });
            } else {
              $('#input-name-change').attr('placeholder', 'enter a name!');
              setTimeout(function() {
                $('#input-name-change').attr('placeholder', 'change your name');
              }, 1000);
            }
          });
        });

        $('#info-button').on('click', function() {
          $('.menu-button').removeClass('selected');
          $(this).addClass('selected');
          $('.menu-content').fadeOut(1, function() {
            $infoContent.fadeIn(1);
          });
        });

        $('#sound-button').on('click', function() {
          $('.menu-button').removeClass('selected');
          $(this).addClass('selected');
          $('.menu-content').fadeOut(1, function() {
            $soundContent.fadeIn(1);
          });

          $('#sound-toggle-on').on('click', function() {
            playSound = true;
            $('#sound-toggle-off').removeClass('selected');
            $(this).addClass('selected');
          });

          $('#sound-toggle-off').on('click', function() {
            playSound = false;
            $('#sound-toggle-on').removeClass('selected');
            $(this).addClass('selected');
          });
        });

        $('#quit-button').on('click', function() {
          $('.menu-button').removeClass('selected');
          $(this).addClass('selected');
          $('.menu-content').fadeOut(1, function() {
            $quitContent.fadeIn(1);
            $('#quit-confirm-button').on('click', function() {
              $menuButtons.slideUp(250, function() {
                $infoPanelOverlay.fadeOut(250, function() {
                  $('#card-table').remove();
                  $('#menu-button').css({'color': 'white'});
                  $('#info-panel-overlay').remove();
                  $('#menu-button').remove();
                  $('#chat-button').remove();
                  $('#chat-container').remove();
                  socket.emit('left user');
                  inputName();
                });
              });
            });
          });
        });
      });
      
    } else {
      $menuButtons.slideUp(250, function() {
        $infoPanelOverlay.fadeOut(250, function() {
          $('#menu-button').css({'color': 'white'});
          //$infoPanelOverlay.remove();
        });
      });
    }
  });
  // ALL OF ABOVE HANDLES THE MENU

  // minimize chat window after a second
  setTimeout(function() {
    $chatContainer.children().fadeToggle(250, 'swing', function() {
        $chatContainer.height(40);
        $chatContainer.width(40);
        $chatButton.css({'color': 'rgba(255,255,255,1)'});
      });
  }, 1000);

  $('#chat-button').on('click', function() {
    if ($chatContainer.height() === 40) {
      $chatContainer.css({'height': ''});
      $chatContainer.css({'width': ''});
      $chatContainer.children().delay(250).fadeToggle();
      $chatButton.css({'color': 'rgba(255,255,255,.5)'});
    } else {
      $chatContainer.children().fadeToggle(250, 'swing', function() {
        $chatContainer.height(40);
        $chatContainer.width(40);
        $chatButton.css({'color': 'rgba(255,255,255,1)'});
      });
    }
  })

  $('#chat-form').on('submit', function() {
    let text = $('#chat-input').val();
    socket.emit('chat message', {text: text, name: player.name});
    $('#chat-input').val('');
    return false;
  });

  // PLACEHOLDER TO SKIP NAME INPUT, COMMENT OUT FOR PRODUCTION
  //socket.emit('new user', { name: player.name });
};

// 'welcome' IS SERVER'S RESPONSE TO 'new user', initial info dumped on new user when they join
socket.on('welcome', function(data) {
  // 'data' is users, currentPlayers, dealerHand, greeting, gameInProgress
  users = data.users;
  players = data.currentPlayers;
  dealer.hand = data.dealerHand;

  data.currentPlayers.forEach((currentPlayer) => {
    assignNewPlayer(currentPlayer);
  });

  $('#message').html(`<p>${data.greeting}!</p>`);
  $('#message p').delay(1000).fadeOut(400, function() {$(this).remove()});

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
  let $sitButton = $('<button>', {class: 'sit-button', style: 'align-self: flex-start; margin-top: 10px;'}).text('SIT');

  // only add if there isn't already a sit button and you're not already playing
  if($('.sit-button').length === 0 && !$('.primary').attr('id')) {
    $('.primary').append($sitButton);

    if(!$._data($('.sit-button')[0], 'events')) {
      $('.sit-button').on('click', function() {
        // tells server that you're joining as player
        socket.emit('deal me in', {name: player.name, money: player.money});

        $('#money-box').children().removeClass('hidden');
        $('.primary').attr({'id': 'player-hand'});
        $sitButton.remove();
        placeBet();
      });
    }
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
        $(this).prev().find('.hand-player-name').text(newPlayer.name);
        newPlayer.bet ? $(this).prev().find('.hand-player-bet').text(`$${newPlayer.bet}`) : '';
        newPlayer.displayTotal ? $(this).prev().find('.hand-player-total').text(newPlayer.displayTotal) : '';
        $(this).prev().find('.hand-player-money').text(`$${newPlayer.money}`);
        newPlayer.id = null;
        return false;
      }
    });
    // ...assign them to the center spot if all the others are filled
    if (players.length === 5 && $('.other.occupied').length === 4 && $('.primary').attr('id') !== 'player-hand') {
      $('.primary').first().addClass('occupied');
      $('.primary').first().attr({'id': newPlayer.id});
      $('.primary').prev().find('.hand-player-name').text(newPlayer.name);
      newPlayer.bet ? $('.primary').prev().find('.hand-player-bet').text(`$${newPlayer.bet}`) : '';
      newPlayer.displayTotal ? $('.primary').prev().find('.hand-player-total').text(newPlayer.displayTotal) : '';
      $('.primary').prev().find('.hand-player-money').text(`$${newPlayer.money}`);
    };
  }
}

// 'player left' IS THE SERVER TELLING YOU THAT A PLAYER LEFT
socket.on('player left', function(data) {
  // 'data' is leftPlayer
  if (data.leftPlayer.id !== socket.id) {
    removePlayer(data.leftPlayer);
  }
});

// REMOVES A DEPARTING PLAYER FROM THE TABLE
function removePlayer(leftPlayer) {
  console.log(`${leftPlayer.id} left! removing!`);
  let playerIndex = findById(players, leftPlayer.id);
  let $primaryHand = $('.primary').first();

  players.splice(playerIndex, 1);

  if (leftPlayer.id !== socket.id) {
    $('.other').each(function(index) {
      if ($(this).attr('id') === leftPlayer.id) {
        $(this).attr({'id': ''});
        $(this).css({'width': '', 'border-radius': ''});
        $(this).removeClass('occupied');
        $(this).children().remove();
        $(this).prev().find('p').text('');
        // if there is a non-you user in the primary hand spot, put them in this now-empty spot
        // so you have the option of playing
        if ($primaryHand.attr('id') && $primaryHand.attr('id') !== 'player-hand') {
          $(this).attr({'id': $primaryHand.attr('id')});
          $primaryHand.attr({'id': ''});

          $(this).addClass('occupied');
          $primaryHand.removeClass('occupied');

          $(this).append($primaryHand.children());
          $primaryHand.children().remove();

          if ($primaryHand.children().attr('class') === 'split-hand') {
            $(this).css({'width': '200px', 'border-radius': '20%'});
            $primaryHand.css({'width': '', 'border-radius': ''});
          }

          $(this).prev().children().remove();
          $(this).prev().append($primaryHand.prev().children());
          $primaryHand.prev().find('p').text('');
        }
      };
    })
    if ($primaryHand.attr('id') === leftPlayer.id) {
      $primaryHand.attr({'id': ''});
      $primaryHand.removeClass('occupied');
      $primaryHand.children().remove();
      $primaryHand.prev().find('p').text('');
    }
  }
}

// PROVIDES INPUT FIELD FOR PLAYER TO INPUT BET AMOUNT
function placeBet(turn) {
  let $betForm = $('<div>', {'id': 'bet-form'});
  let $inputBet = $('<input>', {'type': 'text', 'id': 'input-bet', 'min': 1, 'max': `${player.money}`, 'value': `${player.bet || 10}`, 'formmethod': 'post', 'size': '4'});
  let $submitBet = $('<input>', {'type': 'submit', 'id': 'submit-bet', 'value': 'BET'});
  let $messageBox = $('#message');

  // $messageBox.html('<p>Place your bet: </p>');
  $messageBox.html('');
  $betForm.append($inputBet).append($submitBet);
  $messageBox.append($betForm);

  $inputBet.keyup(function(event) {
    let betAmount = parseInt($inputBet.val());
    
    setTimeout(function() {
      console.log(event.target.value);
      if (event.target.value.length > 2) {
        $('#input-bet').attr({'size': `${event.target.value.length + 1}`})
      }
    }, 5);
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
    
    if (playSound === true) {
      chipSound.play();
    }
    
    $('#player-money p').text(`$${centify(player.money)}`);
    $('#player-bet p').text(`$${player.bet}`);
    $messageBox.children().remove();
  
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

// 'player bet' IS THE SERVER LETTING US KNOW SOMEONE ELSE'S BET
socket.on('player bet', function(data) {
  // 'data' is otherPlayer
  $(`#${data.otherPlayer.id}`).prev().find('.hand-player-bet').text(`$${data.otherPlayer.bet}`);
  $(`#${data.otherPlayer.id}`).prev().find('.hand-player-money').text(`$${data.otherPlayer.money}`);
});

// 'deal cards' RECEIVES THE INITIAL DEALT CARD DATA
socket.on('deal cards', function(data) {
  // 'data' is players, dealer

  dealCards(data.players, data.dealer);

});

// RENDERS THE INITIAL TWO CARDS FOR ALL PLAYERS (and maybe TESTS FOR BLACKJACK)
function dealCards(players, dealer) {
  // console.log('deal em out!');

  let $messageBox = $('#message');

  // just in case there are any card divs for whatever reason...
  $('.hand').children().remove();
  $('.hand').css({'width': '', 'border-radius': ''});
  $('.hand-player-total').text('');
  $('#dealer-box').addClass('hidden');

  $messageBox.html('<p>Dealing \'em out!</p>');
  $('#message p').delay(1000).fadeOut(400, function() {$(this).remove()});

  players.forEach((serverPlayer) => {
    if (serverPlayer.id === socket.id) {
      player.hand = serverPlayer.hand;
      player.total = serverPlayer.total;
      player.displayTotal = serverPlayer.displayTotal;

      player.hand.forEach((card) => {
        let $newCard = ($('<div>', {'class': 'card removed'}));
        $newCard.css('background-image', `url('${card.img}')`);
        $('#player-hand').append($newCard);
      });

      $('#player-total p').text(player.displayTotal);

    } else {

      serverPlayer.hand.forEach((card) => {
        let $newCard = ($('<div>', {'class': 'card removed'}));

        $newCard.css('background-image', `url('${card.img}')`);

        $newCard.attr('id', `${serverPlayer.id}-card-${serverPlayer.hand.length}`);
        $(`#${serverPlayer.id}`).append($newCard);
      });

    }
  })

  dealer.forEach((dealerCard) => {
    let $newCard = ($('<div>', {'class': 'card removed'}));
    $newCard.css('background-image', `url('${dealerCard.img}')`);
    $('#dealer-hand').append($newCard);
  });

  // below is the animation timing allowing the cards to fly in in order, as if dealt by a dealer
  // see style.css for animation details
  $('.hand').children().removeClass('removed');
  $('.hand').children().addClass('hidden');

  var timeout = 0;

  // deal the cards for you, the player, first
  for (let i = 1; i <= player.hand.length; i++) {
    setTimeout(function() {
      $(`#player-hand div:nth-child(${i})`).removeClass('hidden');
      $(`#player-hand div:nth-child(${i})`).addClass('flyin');
      if (playSound === true) {
        playCardSound('slide');
      }
    }, timeout);
    timeout += 250;
  };

  // deal the cards for the other players and display their totals
  players.forEach((otherPlayer) => {
    if (otherPlayer.id !== socket.id) {
      for (let i = 1; i <= otherPlayer.hand.length; i++) {
        setTimeout(function() {
          $(`#${otherPlayer.id} div:nth-child(${i})`).removeClass('hidden');
          $(`#${otherPlayer.id} div:nth-child(${i})`).addClass('flyin');
          if (playSound === true) {
            playCardSound('slide');
          }
        }, timeout);
      timeout += 250;
      }

      setTimeout(function() {
        $(`#${otherPlayer.id}`).prev().find('.hand-player-total').text(otherPlayer.displayTotal);
      }, timeout);
    }
  });

  for (let i = 1; i <= dealer.length; i++) {
    setTimeout(function() {
      $(`#dealer-hand div:nth-child(${i})`).removeClass('hidden');
      $(`#dealer-hand div:nth-child(${i})`).addClass('flyin');
      if (playSound === true) {
        playCardSound('slide');
      }
    }, timeout);
    timeout += 250;
  };
  
  if ($('.primary').attr('id') === 'player-hand') {
    setTimeout(function () {
      $('#player-box').removeClass('hidden');

      $('#hit-button').text('HIT');
      $('#hit-button').removeClass('removed');

      $('#stand-button').text('STAND');
      $('#stand-button').removeClass('removed');

      $('#double-button').removeClass('removed');

      $('#split-button').removeClass('removed');

      socket.emit('player ready');
    }, timeout);
  }

};

// PLAYERTURN ACTIVATES PLAYER BUTTONS
// ALSO ACCOUNTS FOR SPLIT HANDS
function playerTurn() {
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  let $doubleButton = $('#double-button');
  let $splitButton = $('#split-button');

  $hitButton.removeClass('subdued');
  $standButton.removeClass('subdued');

  // currently player cannot double down after they have split
  // re-enable when you've accounted for that
  if (player.money >= player.bet && player.splitHand === null) {
    $doubleButton.removeClass('subdued');

    if(!$._data($('#double-button')[0], 'events')) {
      $doubleButton.on('click', function() {
        doubleDown();
      });
    }
  }

  if (player.splitHand === null) {
    if (player.hand[0].realValue === player.hand[1].realValue) {
      $splitButton.removeClass('subdued');
      
      if (!$._data($('#split-button')[0], 'events')) {
        $splitButton.on('click', function() {
          splitHand();
        });
      }
    } 
    // currently player cannot split again after they have split
    // re-enable when you've accounted for that
  } //else {
  //   if (player.hand[player.splitHand][0].realValue === player.hand[player.splitHand][1].realValue) {
  //     $splitButton.removeClass('subdued');
      
  //     $splitButton.on('click', function() {
  //       splitHand();
  //     });
  //   }
  // }

  if (!$._data($('#hit-button')[0], 'events')) {
    $hitButton.on('click', function() {
      socket.emit('hit me');

      $('#double-button').addClass('subdued');
      $('#double-button').off('click');
      $('#split-button').addClass('subdued');
      $('#split-button').off('click');
    });
  }

  if (!$._data($('#stand-button')[0], 'events')) {
    $standButton.on('click', function() {
      stand();
    });
  }
}

function doubleDown() {
  socket.emit('double down');

  player.doubleDown = true;
  player.money -= player.bet;
  player.bet *= 2;

  $('#player-money p').text(`$${centify(player.money)}`);
  $('#player-bet p').text(`$${player.bet}`);

  socket.emit('hit me');

  $('#button-bar').children().addClass('subdued');
  $('#button-bar').children().off('click');
}

function splitHand() {
  socket.emit('split');

  player.splitHand = 0;
  player.money -= player.bet;
  player.hand = [[player.hand[0]], [player.hand[1]]];

  $('#player-hand').children().removeClass('flyin');

  let $firstCard = $('#player-hand div:nth-child(1)');
  let $secondCard = $('#player-hand div:nth-child(2)');
  let $splitHand1 = $('<div>', {'id': 'player-hand-0', 'class': 'split-hand'}).append($firstCard);
  let $splitHand2 = $('<div>', {'id': 'player-hand-1', 'class': 'split-hand'}).append($secondCard);

  $('#player-hand').css({'width': '200px'});
  $('#player-hand').append($splitHand1).append($splitHand2);

  if (window.innerWidth > 700) {
    $('#player-hand-0').animate({
      left: "-=20px",
      top: "-=10px",
    }, 250);
    $('#player-hand-1').animate({
      right: "-=20px",
      bottom: "-=10px",
    }, 250);
  } else {
    $('#player-hand-0').animate({
      left: "-=10px",
      top: "-=10px",
    }, 250);
    $('#player-hand-1').animate({
      right: "-=10px",
      bottom: "-=10px",
    }, 250);
  }

  $('#button-bar').children().addClass('subdued').off('click');
  $('#player-money p').text(`$${centify(player.money)}`);
  $('#player-bet p').html(`$${player.bet} x <span id='split-bet'>${player.hand.length}</span>`);

}

function stand() {
  socket.emit('stand');

  $('#button-bar').children().addClass('subdued');
  $('#button-bar').children().off('click');

  if (player.splitHand !== null) {
    $('#player-hand').children().removeClass('selected');
    if (player.splitHand + 1 < player.hand.length) {
      player.splitHand++;
      $(`#player-hand-${player.splitHand}`).addClass('selected');

      playerTurn();
    }
  }

}

socket.on('player split', function(data) {
  let newCard1 = data.player.hand[0][1];
  let newCard2 = data.player.hand[1][1];
  let $newCard1 = ($('<div>', {'class': 'card removed'}));
  $newCard1.css('background-image', `url('${newCard1.img}')`);
  let $newCard2 = ($('<div>', {'class': 'card removed'}));
  $newCard2.css('background-image', `url('${newCard2.img}')`);

  if (data.player.id === socket.id) {
    player.hand = data.player.hand;
    player.total = data.player.total;
    player.displayTotal = data.player.displayTotal;
    
    $(`#player-hand-0`).append($newCard1);
    $(`#player-hand-1`).append($newCard2);

    let i = 0;

    while (player.total[i] === 21) {
      player.money += player.bet + (player.bet * 1.5);

      player.splitHand++;

      $('#message').append($('<p>').text(`HAND ${player.splitHand} BLACKJACK! YOU WIN $${player.bet * 1.5}!`).delay(1000).fadeOut(400, function() {$(this).remove()}));
      $('#player-money p').text(`$${centify(player.money)}`);
      localStorage.setItem('playerMoney', player.money);

      if (parseInt($('#split-bet')[0].textContent) - 1 !== 0) {
        $('#split-bet').text(`${parseInt($('#split-bet')[0].textContent) - 1}`);
      } else {
        $('#player-bet p').text('$0');
      }

      i++;
    } 

    // if player hasn't blackjacked in all split hands...
    if (player.splitHand < player.hand.length) {
      $(`#player-hand-${player.splitHand}`).addClass('selected');
      playerTurn();
    } else {
      $('#stand-button').removeClass('subdued');
      $('#stand-button').on('click', stand);
    }

  } else {
    var playerId = `${data.player.id}`;

    $(`#${playerId}`).children().removeClass('flyin');
    let $firstCard = $(`#${playerId} div:nth-child(1)`);
    let $secondCard = $(`#${playerId} div:nth-child(2)`);
    let $splitHand1 = $('<div>', {'id': `${playerId}-0`, 'class': 'split-hand'}).append($firstCard).append($newCard1);
    let $splitHand2 = $('<div>', {'id': `${playerId}-1`, 'class': 'split-hand'}).append($secondCard).append($newCard2);;

    $(`#${playerId}`).css({'width': '200px', 'border-radius': '20%'});
    $(`#${playerId}`).append($splitHand1).append($splitHand2);
    $(`#${playerId}-${data.player.splitHand}`).addClass('selected');

    $(`#${playerId}-0`).animate({
      left: "-=5px",
      top: "-=5px",
    }, 250);
    $(`#${playerId}-1`).animate({
      right: "-=5px",
      bottom: "-=5px",
    }, 250);

    $(`#${playerId}`).prev().find('.hand-player-money').text(`$${centify(data.player.money)}`);
    $(`#${playerId}`).prev().find('.hand-player-bet').html(`$${data.player.bet}x<span id='split-bet'>${data.player.hand.length}</span>`);
  }

  $newCard1.removeClass('removed');
  $newCard1.addClass('flyin');
  if (playSound === true) {
    playCardSound('slide');
  }

  setTimeout(function() {
    $newCard2.removeClass('removed');
    $newCard2.addClass('flyin');
    if (playSound === true) {
      playCardSound('slide');
    }
  },250);

  setTimeout(function() {
    if (data.player.id === socket.id) {
      $('#player-total p').html(`${player.displayTotal.join('<br/>')}`);
    } else {
      $(`#${playerId}`).prev().find('.hand-player-total').html(data.player.displayTotal.join('<br/>'));
    }
  }, 500);
  
});

// 'whose turn' IS THE SERVER TELLING YOU WHOSE TURN IT IS
socket.on('whose turn', function(data) {
  // 'data' is player, the player whose turn it is
  $('.hand-player-name').removeClass('selected');
  $('.split-hand').removeClass('selected');

  if (data.player.id === socket.id) {
    // if it's your turn...
    if (player.splitHand === null) {
      $('#message').html('<p>Your turn!</p>');
      $('#message p').delay(1000).fadeOut(400, function() {$(this).remove()});
    } else {
      $(`#player-hand-${player.splitHand}`).addClass('selected');
    }

    playerTurn();

  } else if (data.player.id !== socket.id) {
    // if it's someone elses turn...
    $(`#${data.player.id}`).prev().find('.hand-player-name').addClass('selected');

    if (data.player.splitHand !== null) {
      $(`#${data.player.id}-${data.player.splitHand}`).addClass('selected');
    }
  }
});

// 'new card' RECEIVES NEW CARD DATA WHEN A PLAYER (ANY PLAYER) HITS
socket.on('new card', function(data) {
  hitMe(data.player, data.card);
})

// ADDS A CARD TO THE INDICATED PLAYER'S HAND, (will eventually) UPDATES PLAYER TOTAL
function hitMe(recipient, card) {
  // console.log(`${turn.name} hits!`);
  let $newCard = ($('<div>', {'class': 'card removed'}));

  $newCard.css('background-image', `url('${card.img}')`);

  if(recipient.splitHand === null) {
    if (recipient.id === socket.id) {
      player.hand.push(card);
      player.total = recipient.total;
      player.displayTotal = recipient.displayTotal;
      $(`#player-total p`).text(player.displayTotal);
      $newCard.attr('id', `player-card-${player.hand.length}`);
      $(`#player-hand`).append($newCard);

      if (player.doubleDown === true && player.total <= 21) {
        socket.emit('stand');
      }
    } else {
      $newCard.attr('id', `${recipient.id}-card-${recipient.hand.length}`);
      $(`#${recipient.id}`).append($newCard);
      $(`#${recipient.id}`).prev().find('.hand-player-total').text(recipient.displayTotal);
    }
  } else {
    if (recipient.id === socket.id) {
      player.hand[player.splitHand].push(card);
      player.total[player.splitHand] = recipient.total[player.splitHand];
      player.displayTotal[player.splitHand] = recipient.displayTotal[player.splitHand];
      $(`#player-total p`).text(player.displayTotal.join(' / '));
      $newCard.attr('id', `player-card-${player.splitHand}-${player.hand[player.splitHand].length}`);
      $(`#player-hand-${player.splitHand}`).append($newCard);
    } else {
      $newCard.attr('id', `${recipient.id}-${recipient.splitHand}-card-${recipient.hand.length}`);
      $(`#${recipient.id}-${recipient.splitHand}`).append($newCard);
      $(`#${recipient.id}`).prev().find('.hand-player-total').html(recipient.displayTotal.join('<br/>'));
    }
  }

  $newCard.removeClass('removed');
  $newCard.addClass('flyin');
  if (playSound === true) {
    playCardSound('slide');
  }

};

// 'turn over' IS THE SERVER LETTING YOU KNOW YOU BLACKJACKED OR BUSTED
socket.on('turn over', function() {
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');

  $hitButton.addClass('subdued');
  $standButton.addClass('subdued');

  $hitButton.off('click');
  $standButton.off('click');

  if (player.splitHand === null) {
    // THIS IS FOR PLAYERS WHO ARE NOT SPLITTING
    if (player.total > 21) {
      //$('#message').append($('<p>').text(`BUST!`).delay(1000).fadeOut());
      $('#message').html('<p>BUST!</p>');
      $('#message p').delay(1000).fadeOut(400, function() {$(this).remove()});
      $('#player-bet p').html('$0');
      localStorage.setItem('playerMoney', player.money);
    } else if (player.total === 21 && player.hand.length === 2) {
      player.money += (player.bet + (player.bet * 1.5));
      //$('#message').append($('<p>').text(`BLACKJACK! YOU WIN $${player.bet * 1.5}!`).delay(1000).fadeOut());
      $('#message').html(`<p>BLACKJACK! YOU WIN $${player.bet * 1.5}!</p>`);
      $('#message p').delay(1000).fadeOut(400, function() {$(this).remove()});
      $('#player-money p').text(`$${centify(player.money)}`);
      $('#player-bet p').html('$0');
      localStorage.setItem('playerMoney', player.money);
    }

  } else {
    // THIS IS FOR PLAYERS WHO HAVE SPLIT
    if (player.total[player.splitHand] > 21) {
      //$('#message').append($('<p>').text(`BUST!`).delay(1000).fadeOut());
      $('#message').html('<p>BUST!</p>');
      $('#message p').delay(1000).fadeOut(400, function() {$(this).remove()});
      if (parseInt($('#split-bet')[0].textContent) - 1 !== 0) {
        $('#split-bet').text(`${parseInt($('#split-bet')[0].textContent) - 1}`);
      } else {
        $('#player-bet p').text('$0');
      }
    } else if (player.total[player.splitHand] === 21 && player.hand[player.splitHand].length === 2) {
      player.money += (player.bet + (player.bet * 1.5));
      //$('#message').append($('<p>').text(`BLACKJACK! YOU WIN $${player.bet * 1.5}!`).delay(1000).fadeOut());
      $('#message').html(`<p>BLACKJACK! YOU WIN $${player.bet * 1.5}!</p>`);
      $('#message p').delay(1000).fadeOut(400, function() {$(this).remove()});
      $('#player-money p').text(`$${centify(player.money)}`);
      $('#player-bet p').html('$0');
      localStorage.setItem('playerMoney', player.money);
    }

    $(`#player-hand-${player.splitHand}`).removeClass('selected');

    if (player.splitHand + 1 !== player.hand.length) {
      player.splitHand++;
      playerTurn();
    } else {
      $('#button-bar').children().addClass('subdued').off('click');
    }
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
    if (playSound === true) {
      playCardSound('slide');
    }
  }, timeout);
});

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
  let $hitButton = $('#hit-button');
  let $standButton = $('#stand-button');
  let $doubleButton = $('#double-button');
  let $splitButton = $('#split-button');
  let $dealerFirstCard = $('#dealer-hand div:nth-child(1)');

  $dealerFirstCard.removeClass('flyin');
  $dealerFirstCard.addClass('loop');
  if (playSound === true) {
    playCardSound('flip');
  }

  setTimeout(function() {
    $('#dealer-total p').text(dealerTotal);
    $('#dealer-box').removeClass('hidden');
    $dealerFirstCard.css('background-image', `url(${dealerHiddenCard}`);
  }, 500);
  
  setTimeout(function() {
    if (winStatus) {
      // players get win statuses, so if user is a player, gives them their money, resets their bet, 
      // and gives them the option to either play another game or bow out
      if (winStatus === 'win') {
        if (player.total === 21 && player.hand.length === 2) {
          player.money = player.money;
        } else {
          player.money += player.bet * 2;
          $('#player-bet p').html('$0');
          $('#player-money p').text(`$${centify(player.money)}`);
          localStorage.setItem('playerMoney', player.money);
        }
      } else if (winStatus === 'push') {
        player.money += player.bet;
        $('#player-bet p').html('$0');
        $('#player-money p').text(`$${centify(player.money)}`);
        localStorage.setItem('playerMoney', player.money);
      } else if (winStatus === 'lose') {
        $('#player-bet p').html('$0');
        $('#player-money p').text(`$${centify(player.money)}`);
        localStorage.setItem('playerMoney', player.money);
      } else if (typeof winStatus === 'object') {
        winStatus.forEach((status, index) => {
          if (status === 'win') {
            if (player.total[index] === 21 && player.hand[index].length === 2) {
              player.money = player.money;
            } else {
              player.money += player.bet * 2;
              $('#player-bet p').html('$0');
              $('#player-money p').text(`$${centify(player.money)}`);
              localStorage.setItem('playerMoney', player.money);
            }
          } else if (status === 'push') {
            player.money += player.bet;
            $('#player-bet p').html('$0');
            $('#player-money p').text(`$${centify(player.money)}`);
            localStorage.setItem('playerMoney', player.money);
          } else if (status === 'lose') {
            $('#player-bet p').html('$0');
            $('#player-money p').text(`$${centify(player.money)}`);
            localStorage.setItem('playerMoney', player.money);
          }
        })
      }

      $doubleButton.addClass('removed');
      $splitButton.addClass('removed');

      // buttons to let players opt to play again or not
      $('#button-bar').children().off('click');
      $hitButton.removeClass('subdued');
      $standButton.removeClass('subdued');
      $hitButton.text("I'M IN");
      $standButton.text("I'M OUT");
      $hitButton.one('click', resetGame);
      $standButton.one('click', leaveGame);
    
    } else {
      // for everyone who's not a player, give them the option to join as a player...
      
      // if($('.sit-button').length === 0 && !$('.primary').attr('id')) {
      //   let $sitButton = $('<button>', {id: 'sit-button', style: 'align-self: flex-start; margin-top: 10px;'}).text('SIT');

      //   $('.primary').append($sitButton);
      //   $('.sit-button').on('click', function() {
      //     socket.emit('deal me in', {name: player.name, money: player.money});

      //     $('.hand').children().remove();
      //     $('#message').text(' ');
      //     $('#player-box').addClass('hidden');
      //     $('#dealer-box').addClass('hidden');
      //     $('#money-box').children().removeClass('hidden');
      //     $('.primary').attr({'id': 'player-hand'});

      //     $sitButton.remove();
          
      //     placeBet();
      //   })
      // }

    }

    if (message !== '') {
      if (typeof message === 'object') {
        message = message.filter((msg) => {
          return msg !== '';
        }).join('<br/>');
      }
      let $message = $('<p>').html(`${message}`).delay(1000).fadeOut(400, function() {$(this).remove()});
      $messageBox.append($message);
    }
    
  }, 750);

};

// DISPLAYS 2 DIGITS IF PLAYER HAS DOLLARS AND CENTS
function centify(amount) {
  if (amount % 1) {
    return amount.toFixed(2);
  } else {
    return amount;
  }
};

socket.on('update money', function(data) {
  // 'data' is players
  data.players.forEach((otherPlayer) => {
    if (otherPlayer.id !== socket.id) {
      $(`#${otherPlayer.id}`).prev().find('.hand-player-money').text(`$${otherPlayer.money}`);
    }
  })
});

// 'reset board' IS THE SERVER TELLING THE USERS TO CLEAR THE BOARD
socket.on('reset board', function() {
  resetBoard();
});

function resetBoard() {
  $('.hand').css({'width': '', 'border-radius': ''});
  $('.hand').children().remove();
  $('.hand p').text('');
  $('.hand-player-total').text('');
  $('#message').children().remove();
  $('#player-box').addClass('hidden');
  $('#dealer-box').addClass('hidden');
}

// RESETS GAME & RESTARTS IF PLAYER STILL HAS MONEY
function resetGame() {
  
  resetBoard();
  
  player.hand = [];
  dealer.hand = [];

  if (player.doubleDown) {
    player.bet /= 2;
    player.doubleDown = false;
  }

  if (player.splitHand) {
    player.splitHand = null;
  }

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

  let myIndex = findById(players, socket.id);
  players.splice(myIndex, 1);

  player.hand = [];
  dealer.hand = [];

  $('.hand').children().remove();
  $('.hand').css({'width': '', 'border-radius': ''});
  $('#player-hand').attr({'id': ''});
  $('#message').text(' ');
  $('#player-box').addClass('hidden');
  $('#dealer-box').addClass('hidden');
  $('#money-box').children().addClass('hidden');
  $('#button-bar').children().addClass('removed');
  $('#button-bar').children().addClass('subdued');
  $('#button-bar').children().off('click');
}

//** STARTS THE GAME */
inputName();
//** VERY IMPORTANT */

function findById(array, id) {
  for (let i = 0; i < array.length; i++) {
    if (array[i].id == id) {
      return i;
    }
  }
}


//** HERE ARE THE CHAT SOCKET INTERACTIONS **//

socket.on('new message', function(data) {
  // 'data' is name, id (socket.id), text
  let $name = $('<span>', {'class': 'chat-username'}).text(`${data.name}: `);
  let $text = $('<span>', {'class': 'chat-text'}).text(data.text);
  let $message = $('<p>', {'class': 'chat-message'}).append($name).append($text);

  if ($('#chat-container').height() === 40) {
    $('#chat-button').css({'color': 'yellow'});
  }

  $('#chat-messages').prepend($message);
});

socket.on('name change', function(data) {
  $(`#${data.id}`).prev().find('.hand-player-name').text(data.name);

  let $name = $('<span>', {'class': 'chat-username'}).text(`::: `);
  let $text = $('<span>', {'class': 'chat-text'}).text(`${data.text}`);
  let $message = $('<p>', {'class': 'notification', 'id': 'name-change-notification'}).append($name).append($text);

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

//COMMENT OUT FOR PRODUCTION
// socket.on('server reset', function() {
//   $('#card-table').remove();
//   $('#menu-button').css({'color': 'white'});
//   $('#info-panel-overlay').remove();
//   $('#menu-button').remove();
//   $('#chat-button').remove();
//   $('#chat-container').remove();

//   if ($('#input-name').length === 0) {
//     inputName();
//   }
//   $('body').append($('<p>').css({'color': 'red'}).text('SERVER RESET').delay(1000).fadeOut('slow', function() {$(this).remove()}));
// })

});
