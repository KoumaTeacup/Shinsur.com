var http = require('http');
var dt = require('./myfirstmodule');
var url = require('url');
var fs = require('fs');

var server = http.createServer(function (req, res) {
	var q = url.parse(req.url, true);
	
	var filename = q.pathname == '/' ? './Default.html' : '.' + q.pathname;
	
	fs.readFile(filename, function(err, data){
		if(err) {
			res.writeHead(404, {'Content-Type': 'text/html'});
			return res.end("404 Not Found");
		}
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(data);
		// res.write("Hello MB!\n \
		// 	The date and time are currently: " + dt.myDateTime()
		// 	+ "URL: " + req.url);
		return res.end();
	});
});

server.listen(80);