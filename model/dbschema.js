var mongoose = require ("mongoose");
var message = require('./schemas/message.js');
var user = require('./schemas/user.js');
var team = require('./schemas/team.js');

exports.mongoose = mongoose;

var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/NewDatabase';

mongoose.connect(uristring, function (err, res) {
  if (err) {
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + uristring);
  }
});

/** Uncomment to remove all collections on startup
user.model.remove({}, function(err) { 
   console.log('collection removed') 
});

message.model.remove({}, function(err) { 
   console.log('collection removed') 
});

team.model.remove({}, function(err) { 
   console.log('collection removed') 
});*/

exports.messageModel = message.model;
exports.teamModel = team.model;
exports.userModel = user.model;