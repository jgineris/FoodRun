exports.view = function(req, res) {
	res.render('index');
}

var graph = require('fbgraph'); 

var conf = {
    client_id:  	'709776799060816'    
  , client_secret:  '91669e99a59c028b0839b650ca2ee07f'
  , scope:          'user_about_me, user_birthday, user_location, friends_relationships'
  , redirect_uri:   'http://localhost:3000/auth/facebook'
};


exports.fbauthlogin = function(req, res) {

  if (!req.query.code) {
    var authUrl = graph.getOauthUrl({
        "client_id":     conf.client_id
      , "redirect_uri":  conf.redirect_uri
      , "scope":         conf.scope
    });
      
    if (!req.query.error) {
      res.redirect(authUrl);
    } else {
      res.send('access denied');
    }
    return;
  }

  // code is set
  // we'll send that and get the access token
  graph.authorize({
      "client_id":      conf.client_id
    , "redirect_uri":   conf.redirect_uri
    , "client_secret":  conf.client_secret
    , "code":           req.query.code
  }, function (err, facebookRes) {
    	res.redirect('/auth/facebook');
    );
  });
        
}