/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;

var BLACK_ROCKET_ICON = 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421';
var INSOMNIAC_ICON = 'https://shinsur.com/insomniac_logo.png';
var INSOMNIAC_ICON_WHITE = 'https://shinsur.com/insomniac_logo_white.png';
var HELP_HTML = 'https://shinsur.com/trello_help.html';
var SETTINGS_HTML = 'https://shinsur.com/trello_settings.html';
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
    const getCardVotes = t.get('card', 'shared', 'Insom_Votes', 0);
    const getMemberVoted = t.get('member', 'private', 'voted', []);
    const card_id = opts.context.card;
    return Promise.all([getCardVotes, getMemberVoted])
      .then(data => {
        var card_votes = data[0];
        var member_voted = data[1];

        return [{
          icon: INSOMNIAC_ICON_WHITE,
          text: card_votes > 0 ? card_votes : '0',
          color: member_voted.includes(card_id) ? 'green' : 'light-gray',
        }]
      })
  },

  'show-settings': function (t, options) {
    // when a user clicks the gear icon by your Power-Up in the Power-Ups menu
    // what should Trello show. We highly recommend the popup in this case as
    // it is the least disruptive, and fits in well with the rest of Trello's UX
    return t.popup({
      title: 'Insomniac Power-up Settings',
      url: SETTINGS_HTML,
      height: 184 // we can always resize later
    });
  },

  "card-detail-badges": function (t, opts) {
    const card_id = opts.context.card;

    const getMemeberVotedCards = t.get('member', 'private', 'voted', []);
    const getMemeberDratedCards = t.get('member', 'private', 'drafting', []);

    return Promise.all([getMemeberVotedCards, getMemeberDratedCards]).then(data => {
      // Voting
      var voted_card_list = data[0];
      var vote_text = "Click to Vote";
      var vote_color = 'light-gray'
      if (voted_card_list.includes(card_id)) {
        vote_text = "You Voted this!";
        vote_color = 'green';
      }

      // Drafting
      var drafting_card_list = data[1];
      var draft_text = 'Add this card to draft';
      var draft_color = 'light-gray';
      if (drafting_card_list.includes(card_id)) {
        draft_text = 'In Draft';
        draft_color = 'green';
      }

      return [
        //Vote Button
        {
          // card detail badges (those that appear on the back of cards)
          // also support callback functions so that you can open for example
          // open a popup on click
          title: "Votes",
          text: vote_text,
          color: vote_color,
          callback: function (t, opts) {
            // Update card votes data based on user's action: Vote/Unvote
            const index = voted_card_list.indexOf(card_id);
            if (index > -1) {
              t.get('card', 'shared', 'Insom_Votes', 0).then(votes => {
                t.set('card', 'shared', 'Insom_Votes', votes - 1);
              });
              voted_card_list.splice(index);
            } else {
              voted_card_list.push(card_id);
              t.get('card', 'shared', 'Insom_Votes', 0).then(votes => {
                t.set('card', 'shared', 'Insom_Votes', votes + 1);
              });
            }

            // Add this card to the user's voted list
            t.set('member', 'private', 'voted', voted_card_list);

          },
        },

        // Add to draft button
        {
          title: "Drfating",
          text: draft_text,
          color: draft_color,
          callback: function (t, opts) {
            const index = drafting_card_list.indexOf(card_id);
            if (index > -1) {
              voted_card_list.splice(index);
            } else {
              voted_card_list.push(card_id);
            }

            t.set('member', 'private', 'drafting', drafting_card_list);

            const getSpourtPos = t.get('board', 'shared', 'sproutPos', 8);
            const getDraftingListId = t.get('member', 'private', 'drfating_list_id', null);

            return Promise.all([getSpourtPos, getDraftingListId]).then(data => {
              var sprout_pos = data[0];
              var drafting_list_id = data[1] ? data[1] : null;

              fetch('https://shinsur.com/trello/DraftCard?'
                + 'id=' + card_id
                + '&pos=' + sprout_pos
                + '&drafting_id' + drafting_list_id
                , { method: 'POST' });
            })
          }
        }
      ]
    })
  },

  'list-sorters': function (t) {
    return [{
      text: "Insomniac Votes",
      callback: function (t, opts) {
        // Trello will call this if the user clicks on this sort
        // opts.cards contains all card objects in the list
        var promises = [];
        var cards = opts.cards;
        cards.forEach(card => {
          promises.push(t.get(card.id, 'shared', 'Insom_Votes', 0));
        });

        return Promise.all(promises).then(card_votes => {
          var card_vote_objs = [];

          for (var i = 0; i < card_votes.length; ++i) {
            card_vote_objs.push({ id: cards[i].id, votes: card_votes[i] });
          }

          card_vote_objs.sort((a, b) => {
            if (a.vote < b.votes) {
              return 1;
            } else if (b.votes < a.votes) {
              return -1;
            }
            return 0;
          });

          return {
            sortedIds: card_vote_objs.map(card => { return card.id; })
          };
        })
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