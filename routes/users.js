var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/Auto200', function (req, res, next) {
  res.sendStatus(200);
});

module.exports = router;
