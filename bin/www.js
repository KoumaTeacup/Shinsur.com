#!/usr/bin/env node

// load environment
require('dotenv').config()

//Module dependencies.
var app = require('../app');
var debug = require('debug')('shinsur.com:server');
var http = require('http');
var https = require('https');
var fs = require('fs');

var server, port;
if (process.env.ENV == 'prod') {
  // SSL

  const credentials = {
    key: fs.readFileSync('/etc/letsencrypt/live/shinsur.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/shinsur.com/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/shinsur.com/chain.pem')
  }

  port = normalizePort(process.env.PORT || '443');
  server = https.createServer(credentials, app);

  //Setup http server only to redirect
  httpServer = http.createServer(app)
  httpServer.listen('80');
} else if (process.env.ENV == 'dev') {
  port = normalizePort(process.env.PORT || '80');
  server = http.createServer(app);
}

// listen on port
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

console.log('tttttt')

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
