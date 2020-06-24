const http = require('http');
const https = require('https');
const express = require('express');
const url = require('url');
const fs = require('fs');

const app = express();
app.use(express.static(__dirname + '/public'));

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
}

app.get('/', (req, res) => {
	if(req.connection.remoteAddress != '::1' && !req.secure)
	{
		res.redirect('https://' + req.headers.host + req.url);
	}
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

httpServer.listen(80);
httpsServer.listen(443);



// Handle Ctrl+C
process.on('SIGINT', signal => {
  console.log(`Process ${process.pid} has been interrupted`)
  process.exit(0)
})