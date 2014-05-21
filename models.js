var Mongoose = require('mongoose');


var ReviewsSchema = new Mongoose.Schema({
  "fbId": String,
  "reviewText": String,
  "yelpId": String,
  "stars": Number
});

exports.Project = Mongoose.model('Review', ReviewsSchema);

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

exports.Project = Mongoose.model('User', UsersSchema);