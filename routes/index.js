var express = require('express');
var router = express.Router();
var app = express();

router.get('/', function(req, res, next) {
	res.sendFile(app.get('views') + '/Default.html');
});

router.get('/:filename.html', function(req, res){
	res.sendFile(app.get('views') + '/' + req.params.filename + '.html');
});

module.exports = router;
