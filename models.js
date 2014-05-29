var Mongoose = require('mongoose');


var ReviewsSchema = new Mongoose.Schema({
  "fbId": String,
  "reviewText": String,
  "yelpId": String,
  "stars": Number,
  "date": Date
});

exports.Review = Mongoose.model('Review', ReviewsSchema);

var UsersSchema = new Mongoose.Schema({
  "fbId": String,
  "fName": String,
  "lName": String,
  "year": String,
  "typeOfStudent": String,
  "yearMoved": Number,
  "college": String,
  "preferredTravel": Number
});

exports.User = Mongoose.model('User', UsersSchema);