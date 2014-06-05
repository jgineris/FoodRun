//dependencies for each module used
var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');
var app = express();
var mongoose = require('mongoose');
var auth = require('./auth');
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
var models = require('./models');

var hbs = handlebars.create({
  helpers: {
    ifCond: function (v1,v2,options) {
      if(v1 === v2) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    }
  }
}); 

//Configures the Template engine
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(auth.passport.initialize());
app.use(auth.passport.session());

//routes
app.get('/', function(req, res) {
  if(req.param("location") === undefined) {
    res.render('index', {user: req.user});
    return;
  }

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

    res.render('index', { query: req.param("query"), location: req.param("location"), results: data, user: req.user });
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

    models.Checkin
      .find({'yelpId': req.param('id')})
      .sort({'date': -1})
      .exec(renderCheckins);

      function renderCheckins(err, results2) {
        console.log(results2);
        var now = Date.now();
        var diff = 0;

     
        for(var a = 0; a <= results2.length - 1; a++)
        {
          diff = now - results2[a].date.getTime();
          if(diff >= 1800000) //30 min
          {
            console.log("need to be deleted " + results2[a].id);
            models.Checkin.find({'_id': results2[a].id}).remove().exec();
            console.log(results2);
          }

        };

        res.render('listing', { listing: data, reviews: results, user: req.user, checkins: results2 });
      }
    }    
  });
});
app.get('/listing/', index.view);

app.post('/review', function(req, res) {
  if(req.body.yelpid === undefined) {
    res.redirect('/');
    return;
  }
  var newReview = new models.Review({
    "fbId": req.user.id,
    "reviewText": req.body.review,
    "yelpId": req.body.yelpid,
    "stars": req.body.stars,
    "date": new Date().toString(),
    "travel": req.body.travel
  });

  newReview.save(afterSaving)

  function afterSaving(err) {
    if(err) {console.log(err); res.send(500);}
    res.redirect('/listing/'+req.body.yelpid);
  }

});

app.get('/auth/facebook',
auth.passport.authenticate('facebook', { scope: ['user_friends','email'] }),
function(req, res){
  // The request will be redirected to Facebook for authentication, so this
  // function will not be called.
});

app.get('/auth/facebook/callback', 
auth.passport.authenticate('facebook', { failureRedirect: '/' }),
function(req, res) {
  models.User
        .find({'fbId': req.user.id})
        .limit(1)
        .exec(checkUser);

  function checkUser(err, results) {
    console.log(results);

    if(results.length === 0) {
      res.render('account', { user: req.user, account: {'fName':req.user.name.givenName,'lName':req.user.name.familyName}, referer: req.headers['referer'], newUser: true});
    } else {
      res.redirect(req.headers['referer']);
    }
  }  
});

app.get('/account', function(req,res) {
  if(!req.isAuthenticated()) {
    // not logged in
    res.redirect('/');
    return;
  }

  models.User
        .find({'fbId': req.user.id})
        .limit(1)
        .exec(checkUser);

  function checkUser(err, results) {
    console.log(results);

    if(results.length === 0) {
      //sign up for an account first
    } else {
      res.render('account', { user:req.user, account: results[0] });
    }
  }
});

app.post('/account', function(req,res) {
  console.log(req);

  var newUserInfo = {
    "fbId": req.user.id,
    "fName": req.body.fName,
    "lName": req.body.lName,
    "year": req.body.year,
    "typeOfStudent": req.body.type,
    "yearMoved": req.body.since,
    "college": req.body.college,
    "preferredTravel": req.body.travel
  }

  models.User.findOneAndUpdate({
      'fbId': req.user.id
    }, newUserInfo, checkUser)

  function checkUser(err, results) {
    if(err) {console.log(err); res.send(500);}
    console.log(results);

    if(results === null || results.length === 0) {
      var newUser = new models.User(newUserInfo);
      console.log("saving new user");
      newUser.save(checkUser);
      return;
    }

    if(req.body.referer === null || req.body.referer === "") {
      res.render('account', { user: req.user, account: results });
    } else {
      res.redirect(req.body.referer);
    }    
  } 

});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect(req.headers['referer']);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}


app.post('/checkin', function(req,res) {

  var newCheckinInfo = {
    "fbId": req.user.id,
    "displayName": req.user.displayName,
    "yelpId": req.body.yelpid,
    "reason": req.body.reason,
    "date": new Date().toString()
  }

  models.Checkin.findOneAndUpdate({
      'fbId': req.user.id
    }, newCheckinInfo, addcheckin)

  function addcheckin(err, results) {
    if(err) {console.log(err); res.send(500);}
    console.log(results);

    if(results === null || results.length === 0) {
      var newCheckin = new models.Checkin(newCheckinInfo);
      newCheckin.save();      
    }
    res.redirect('/listing/' + req.body.yelpid);
  } 

});
//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});