var express = require('express');
var router = express.Router();
var fetch = require("node-fetch");
const { response } = require('../app');

var key = process.env.TRELLO_KEY;
var token = process.env.TRELLO_TOKEN;
var WIP_Board = '61de496a44adf01630032da0';
var WIP_Sprout_Title_Id = '61ea512d032c6d5ae91dc7ee'

router.post('/AddList', function (req, res) {
  fetch('https://api.trello.com/1/lists?name='
    + req.query.geo
    + '&idBoard=' + WIP_Board
    + '&key=' + key
    + '&token=' + token, {
    method: 'POST'
  })
    .then(response => {
      console.log(
        `Response: ${response.status} ${response.statusText}`
      );
      return response.text();
    })
    .then(text => console.log(text))
    .catch(err => console.error(err));

  console.log('fetch instant return\n');

  res.end();
})

router.post('/DraftCard', async function (req, res) {
  var valid = false;
  var list_id = req.query.drafting_id;

  if (req.query.drafting_id) {
    // test if list still exists
    valid = await fetch('https://api.trello.com/1/lists/' + req.query.drafting_id + '?'
      + 'key=' + key
      + '&token=' + token
      , {
        method: 'GET'
      })
      .then(response => {
        console.log(response.ok);
        return response.ok;
      })
  }

  if (!valid) {
    // Create new list if we don't have one
    list_id = await fetch('https://api.trello.com/1/boards/' + WIP_Board + '/lists?'
      + 'name=Give your sprout a COOL name...'
      + '&key=' + key
      + '&token=' + token
      + '&pos=' + req.query.pos
      , {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      })
      .then(response => response.json())
      .then(async data => {
        // Create title card
        await fetch('https://api.trello.com/1/cards?'
          + 'idList=' + data.id
          + '&idCardSource=' + WIP_Sprout_Title_Id
          + '&keepFromSource=all'
          + '&key=' + key
          + '&token=' + token
          , { method: 'POST' })
          .then(response => response.json())
          .then(data => {
            // clear title card name
            fetch('https://api.trello.com/1/cards/' + data.id + '?'
              + 'name=Click Here to Draft Your Pitch...'
              + '&key=' + key
              + '&token=' + token
              , { method: 'PUT' })

          })
        return data.id;
      })
  }

  if (list_id) {
    // copy the current card
    fetch('https://api.trello.com/1/cards?'
      + 'idList=' + list_id
      + '&idCardSource=' + req.query.id
      + '&keepFromSource=all'
      + '&key=' + key
      + '&token=' + token
      , { method: 'POST' });

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id: list_id }));
  }
})

module.exports = router;
