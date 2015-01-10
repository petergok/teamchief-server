var express = require('express');
var logfmt = require('logfmt');
var pass = require('./model/pass.js');
var passport = require('passport')
var api = require('./api/api.js');

var app = express();

app.use(logfmt.requestLogger());

var bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('port', Number(process.env.PORT || 8090));

app.post('/message', passport.authenticate('local'), api.sendMessage);
app.post('/team', passport.authenticate('local'), api.createTeam);
app.get('/teams', passport.authenticate('local'), api.getTeams);
app.get('/team/:id?', passport.authenticate('local'), api.getTeam);
app.post('/gcmId', passport.authenticate('local'), api.updateRegistrationId);
app.post('/user', api.registerNewUser);

app.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});