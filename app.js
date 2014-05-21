//dependencies for each module used
var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');
var app = express();
var mongoose = require('mongoose');
var dotenv = require('dotenv');
dotenv.load();

var yelp = require("yelp").createClient({
  consumer_key: process.env.CONSUMER_KEY, 
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET
});

//route files to load
var index = require('./routes/index');

//database setup - uncomment to set up your database
var local_database_name = 'foodrun';
var local_database_uri  = 'mongodb://localhost/' + local_database_name
var database_uri = process.env.MONGOLAB_URI || local_database_uri
mongoose.connect(database_uri);

//Configures the Template engine
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());

//routes
app.get('/', index.view);
app.get('/search', function(req, res) {
  var params;
  if(req.param("location").indexOf("current location") !== -1) {
    params = {term: req.param("query"), ll: req.param("ll")}
  } else {
    params = {term: req.param("query"), location: req.param("location")};
  }
  yelp.search(params, function(error, data) {
    console.log(error);
    console.log(data);
    res.render('index', { query: req.param("query"), location: req.param("location"), results: data });
  });
});

app.get('/listing/:id', function(req, res) {
  console.log(req.param('id'));
  yelp.business(req.param('id'), function(error, data) {
    console.log(error);
    console.log(data);
    res.render('listing', { listing: data });
  });
});
app.get('/listing/', index.view);

//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});