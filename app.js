var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var trelloRouter = require('./routes/trello');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public/images')));
app.use(express.static(path.join(__dirname, 'public/javascripts')));
app.use(express.static(path.join(__dirname, 'public/mesh')));
app.use(express.static(path.join(__dirname, 'public/stylesheets')));
app.use(express.static(path.join(__dirname, 'public/pdf')));

// Redirect to force https
app.use((req, res, next) => {
  console.log(`remote address: ${req.socket.remoteAddress}`);
  if (process.env.ENV === 'prod' && !req.secure) {
    res.redirect('https://' + req.headers.host + req.url);
    res.end();
  } else {
    next();
  }
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/trello', trelloRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
