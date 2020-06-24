const http = require('http');
const https = require('https');
const express = require('express');
const url = require('url');
const fs = require('fs');

const app = express();

try{
	var keyFile = fs.readFileSync('/etc/letsencrypt/live/shinsur.com/privkey.pem');
	var certFile = fs.readFileSync('/etc/letsencrypt/live/shinsur.com/cert.pem');
	var caFile = fs.readFileSync('/etc/letsencrypt/live/shinsur.com/chain.pem');
}catch (err){
	console.log(err);
}

const credentials  = {
	key: keyFile,
	cert: certFile,
	ca: caFile
	// key: fs.readFileSync('/etc/letsencrypt/live/shinsur.com/privkey.pem'),
	// cert: fs.readFileSync('/etc/letsencrypt/live/shinsur.com/cert.pem'),
	// ca: fs.readFileSync('/etc/letsencrypt/live/shinsur.com/chain.pem')
}

app.get('/', (req, res) => {
	const q = url.parse(req.url, true);
	
	const filename = q.pathname == '/' ? './Default.html' : '.' + q.pathname;
	
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
})

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

app.use(express.static(__dirname + '/public'));
httpServer.listen(80);
httpsServer.listen(443);