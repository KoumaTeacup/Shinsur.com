var express = require('express');
var router = express.Router();
var fetch = require("node-fetch");

var key = '672ab4bc0f8c05ba1c73242a6e30f513'
var token = '128db3b5f02f02604ff2e9830c695e0ea7206efe6b0c717f2e7ca2b910a70572';
var WIP_Board = '61de496a44adf01630032da0';

router.post('/AddList', function (req, res) {
  fetch('https://api.trello.com/1/lists?name=' +
    req.query.geo +
    '&idBoard=' + WIP_Board +
    '&key=' + key +
    '&token=' + token, {
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

router.post('/VoteCard', function (req, res) {
  fetch('https://api.trello.com/1/lists?name=' + 'Vote Card Return' +
    '&idBoard=' + WIP_Board +
    '&key=' + key +
    '&token=' + token, {
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

module.exports = router;
