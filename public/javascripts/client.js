/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;

var BLACK_ROCKET_ICON = 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421';
var INSOMNIAC_ICON = 'https://shinsur.com/insomniac_logo.png';
var LIKE_ICON = 'https://shinsur.com/IG_Garden_like.png';
var HELP_HTML = 'https://shinsur.com/trello_help.html';
var INSOMNIAC_HOME = 'https://insomniac.games/';

TrelloPowerUp.initialize({
  // Board Buttons
  'board-buttons': function (t, opts) {
    return [{
      // we can either provide a button that has a callback function
      icon: {
        dark: INSOMNIAC_ICON,
        light: INSOMNIAC_ICON
      },
      text: 'Welcome To IP Garden',
      callback: showWelcome,
      condition: 'edit'
    }];
  },

  // Badges
  "card-badges": function (t, opts) {
    return t.get('card', 'shared', 'Insom_Votes', 0)
      .then(function (votes) {
        return [{
          icon: LIKE_ICON,
          text: "Insomniac Votes: " + votes,
          color: 'blue'
        }]
      })
  },

  'show-settings': function (t, opts) {
    return showWelcome;
  },

  "card-detail-badges": function (t, opts) {
    const getVotedCards = t.get('member', 'private', 'voted', []);
    const card_id = opts.context.card;
    Promise.all([getVotedCards]).then(card_list => {
      var vote_text = "Vote";
      var vote_color = 'light-gray'
      if (card_list.includes(card_id)) {
        vote_text = "Voted!";
        vote_color = 'green';
      }
      return [
        {
          // card detail badges (those that appear on the back of cards)
          // also support callback functions so that you can open for example
          // open a popup on click
          title: "Insomniac Votes",
          text: vote_text,
          color: vote_color,
          callback: function (t, opts) {
            const index = card_list.indexOf(card_id);
            if (index > -1) {
              card_list.splice(index);
            } else {
              card_list.push(card_id);
            }

            t.set('member', 'private', 'voted', card_list);
            //fetch('https://shinsur.com/trello/VoteCard?id=' + t.getContext().card, { method: 'POST' });
          },
        }
      ]
    })
    return t.get('card', 'shared', 'Insom_Votes', 0)
      .then(function (votes) {
        return [
          {
          }
        ];
      })
  },

  'list-sorters': function (t) {
    return [{
      text: "Insomniac Votes",
      callback: function (t, opts) {
        // Trello will call this if the user clicks on this sort
        // opts.cards contains all card objects in the list
        var sortedCards = opts.cards.sort(
          function (a, b) {
            if (a.name > b.name) {
              return 1;
            } else if (b.name > a.name) {
              return -1;
            }
            return 0;
          });

        return {
          sortedIds: sortedCards.map(function (c) { return c.id; })
        };
      }
    }];
  },
}, {
  appKey: '672ab4bc0f8c05ba1c73242a6e30f513',
  appName: 'Insomniac IP Garden'
});

var showWelcome = function (t, opts) {
  return t.boardBar({
    // required URL to load in the iframe
    url: HELP_HTML,
    // optional arguments to be passed to the iframe as query parameters
    // access later with t.arg('text')
    args: { text: 'Hello' },
    // optional color for header chrome
    accentColor: '#F2D600',
    // initial height for iframe
    height: 200, // initial height for iframe
    // optional function to be called if user closes modal
    callback: () => console.log('Goodbye.'),
    // optional boolean for whether the user should
    // be allowed to resize the bar vertically
    resizable: true,
    // optional title for header chrome
    title: 'IP Garden Guide',
    // optional action buttons for header chrome
    // max 3, up to 1 on right side
    actions: [{
      icon: INSOMNIAC_ICON,
      url: INSOMNIAC_HOME,
      alt: 'Leftmost',
      position: 'left',
    }],
  });
};