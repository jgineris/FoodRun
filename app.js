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
var loginerror = require('./routes/loginerror');
var accounterror = require('./routes/accounterror');

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

    for (var i = data.businesses.length - 1; i >= 0; i--) {
      models.Review
          .find({'yelpId': data.businesses[i].id})
          .exec(averageRating);

      function averageRating(err, results) {
        var average = 0;
        for (var j = results.length - 1; j >= 0; j--) {
          average += results[j].stars;
        };
        if(results.length !== 0) {
          for (var k = data.businesses.length - 1; k >= 0; k--) {
            if(data.businesses[k].id === results[0].yelpId) {
              data.businesses[k].foodrunStars = average/results.length;
              break;
            }
          };
        }
      }
    };

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

      var average = 0;
      for (var j = results.length - 1; j >= 0; j--) {
        average += results[j].stars;
      };
      if(results.length !== 0) {
        data.foodrunStars = average/results.length;
      }

      res.render('listing', { listing: data, reviews: results });
    }    
  });
});

app.get('/listing/', index.view);
app.get('/signup', signup.view);
app.get('/auth/facebook', signup2.fbauthlogin);
app.get('/signup2', signup2.fbuser);
app.get('/login', home.authlogin);
app.get('/accounterror', accounterror.view);
app.get('/loginerror', loginerror.view);

var graph = require('fbgraph'); 

app.get('/home', function(req, res){    
    graph.get("/me", function(err, res1) {
       console.log(res1);
       models.User
        .find({'fbId': res1.id })
        .exec(findUser);

    function findUser(err, results) {
      console.log(results);
      var foundUser = false;
      //No user accounts yet
      if(results.length == 0)
      {
        res.redirect('/loginerror');
      }
       
      for(var a = 0; a <= (results.length - 1); a++)
      {
        //User account exists
        if(res1.id == results[a].fbId)
        {
          // console.log("Found user account!!");
          foundUser = true;
        }
      };
      if(foundUser)
      {
        res.render('home', res1);
      }
      else
      {
        //User account doesn't exist
        res.render('loginerror');
      }      

    } //end function
    });
    
});


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
// console.log("bike " + req.body.bike);
// console.log("car " + req.body.car);

  if(req.body.fbid === undefined) {
    res.redirect('/');
    return;
  }

  var accountExists = false;
  models.User
        .find({'fbId': req.body.fbid })
        .exec(userExists);
  

        function userExists(err, results) {
          console.log(results);

          for(var a = 0; a <= (results.length - 1); a++)
          {
        //User already has account
        if(req.body.fbid == results[a].fbId)
        {
          // console.log("User already has account!!");
          //go to error page
          accountExists = true;
        }
      };

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

      if(accountExists)
      {
        res.render('accounterror');
        return;
      }    
      else
      {    
        newUser.save(afterSaving)
        function afterSaving(err) {
          if(err) {console.log(err); res.send(500);}
          res.redirect('/home');
        }
      }

  } //end function

});

//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});