//dependencies for each module used
var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');
var app = express();
var mongoose = require('mongoose');
var dotenv = require('dotenv');
dotenv.load();

//Yelp
var yelp = require("yelp").createClient({
  consumer_key: process.env.CONSUMER_KEY, 
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET
});

//route files to load
var index = require('./routes/index');
var signup = require('./routes/signup');
var signup2 = require('./routes/signup2');
var home = require('./routes/home');

//database setup - uncomment to set up your database
var local_database_name = 'foodrun';
var local_database_uri  = 'mongodb://localhost/' + local_database_name
var database_uri = process.env.MONGOLAB_URI || local_database_uri
mongoose.connect(database_uri);
var models = require('./models');

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

    models.Review
          .find({'yelpId': req.param('id')})
          .sort({'date': -1})
          .exec(renderReviews);

    function renderReviews(err, results) {
      console.log(results);
      res.render('listing', { listing: data, reviews: results });
    }    
  });
});

app.get('/listing/', index.view);

app.get('/signup', signup.view);
app.get('/auth/facebook', signup2.fbauthlogin);
app.get('/signup2', signup2.fbuser);
app.get('/home', home.view)

app.post('/review', function(req, res) {
  if(req.body.yelpid === undefined) {
    res.redirect('/');
    return;
  }
  var newReview = new models.Review({
    "fbId": req.body.name, // name for now, fbid in the future
    "reviewText": req.body.review,
    "yelpId": req.body.yelpid,
    "stars": req.body.stars,
    "date": new Date().toString()
  });

  newReview.save(afterSaving)

  function afterSaving(err) {
    if(err) {console.log(err); res.send(500);}
    res.redirect('/listing/'+req.body.yelpid);
  }

});

app.post('/createUser', function(req, res) {

  if(req.body.fbid === undefined) {
    res.redirect('/');
    return;
  }
  
  var newUser = new models.User({
    "fbId": req.body.fbid, 
    "fName": req.body.fname,
    "lName": req.body.lname,
    "year": req.body.year,
    "typeOfStudent": req.body.typeOfStudent,
    "yearMoved": 1900,
    "college": req.body.college,
    "preferredTravel": ""
  });

  newUser.save(afterSaving)

  function afterSaving(err) {
    if(err) {console.log(err); res.send(500);}
    res.redirect('/home');
  }

});

//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});