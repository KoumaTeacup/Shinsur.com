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
      callback: onBtnClick,
      condition: 'edit'
    }];
  },

  // Badges
  "card-badges": function (t, opts) {
    //let cardAttachments = opts.attachments; // Trello passes you the attachments on the card
    //return t
    //  .card("name")
    //  .get("name")
    //  .then(function (cardName) {
    //    console.log("We just loaded the card name for fun: " + cardName);
    //    return [
    //      {
    //        // It's best to use static badges unless you need your
    //        // badges to refresh.
    //        // You can mix and match between static and dynamic
    //        text: "Vote",
    //        icon: "IG_Garden_like.png", // for card front badges only
    //        color: "green",
    //      },
    //    ];
    //  });
    return [{
      icon: LIKE_ICON,
      text: "Vote",
      callback: onBtnClick,
      color: 'blue'
    }]
  },

  'show-settings': function (t, opts) {
    return onBtnClick;
  }
});

var onBtnClick = function (t, opts) {
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