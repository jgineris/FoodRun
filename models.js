var Mongoose = require('mongoose');


var ReviewsSchema = new Mongoose.Schema({
  "fbId": String,
  "displayName": String,
  "reviewText": String,
  "yelpId": String,
  "stars": Number,
  "date": Date,
  "travel": Number
});

exports.Review = Mongoose.model('Review', ReviewsSchema);

var UsersSchema = new Mongoose.Schema({
  "fbId": String,
  "fName": String,
  "lName": String,
  "year": Number,
  "typeOfStudent": Number,
  "yearMoved": Number,
  "college": Number,
  "preferredTravel": Number
});

exports.User = Mongoose.model('User', UsersSchema);

var CheckinSchema =  new Mongoose.Schema({
  "fbId": String,
  "displayName": String,
  "yelpId": String,
  "reason": String,
  "date": Date
});

exports.Checkin = Mongoose.model('Checkin', CheckinSchema);
