var express = require('express');
var router = express.Router();
var path = require('path');
var app = express();

router.get('/', function(req, res, next) {
	res.sendFile(app.get('views') + '/Default.html');
});

// router.get('/views/:filename.html', function(req, res){
// 		console.log('bbbbb');
// 	res.sendFile(path.join(__dirname + 'views/Default.html'), function (err){
// 		res.end(err);
// 	});
// });

module.exports = router;
