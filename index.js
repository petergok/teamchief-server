var express = require('express');
var logfmt = require('logfmt');
var http = require('http');
var gcm = require('node-gcm');
var passport = require('./config/pass.js');
var db = require('./config/dbschema.js');

var app = express();

app.use(logfmt.requestLogger());

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded())

app.set('port', Number(process.env.PORT || 8090));

app.put('/message', passport.ensureAuthenticated, sendMessage);
app.put('/user', registerNewUser);

function registerNewUser(req, res, next) {
    console.log(req.body);
    if (!req.body || !req.body.gcmId || !req.body.username || !req.body.email 
        || !req.body.password || !req.body.appVersion) {
        res.status(400).send('Invalid request');
        return;
    }

    var newUser = new db.userModel({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        gcmId: req.body.gcmId,
        gcmIdAppVersion: req.body.appVersion
    })

    res.send("CREATED");
}

function sendMessage(req, res, next) {
    res.send("Authenticated!!!!!");
};

app.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});