var express = require('express');
var logfmt = require('logfmt');
var http = require('http');
var gcm = require('node-gcm');
var pass = require('./config/pass.js');
var passport = require('passport')
var db = require('./config/dbschema.js');
var async = require('async');

var app = express();

var SUCCESS_RESULT = "SUCCESS";

app.use(logfmt.requestLogger());

var bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('port', Number(process.env.PORT || 8090));

app.post('/message', passport.authenticate('local'), sendMessage);
app.post('/conversation', passport.authenticate('local'), createConversation);
app.get('/conversations', passport.authenticate('local'), getConversations);
app.get('/conversation/:id?', passport.authenticate('local'), getConversation);
app.post('/user', registerNewUser);

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
        gcmIdAppVersion: req.body.appVersion,
        conversations: []
    });

    newUser.save(function (err) {
        if(err) {
            console.log(err);
            res.send("Error Creating");
        } else {
            res.send(SUCCESS_RESULT);
        }
    });
};

function getConversations(req, res, next) {
    console.log(req.query);

    db.userModel.findOne({username: req.query.username}).exec(function(err, user) {
        if (err) {
            console.log(err);
            res.send(new Error('Error finding user'));
            return;
        }

        db.conversationModel.find({}).where('_id').select('-__v').in(user.conversations).sort('-latestActive')
        .populate({
            path: 'messages',
            select: '-_id _sender sendTime text',
            options: {
                limit: 1,
                sort: { 'sendTime': -1 }
            }
        }).populate({
            path: 'users',
            select: '-_id username'
        }).exec(function(err, conversations) {
            if (err) {
                console.log(err);
                res.send(new Error('Error finding conversations'));
                return;    
            }
            if (!conversations) {
                res.send({});
                return;
            }

            async.map(conversations, function(conversation, done) {
                if (!conversation.messages[0]) {
                    return done(null, conversation);
                }

                var message = conversation.messages[0];
                conversation.messages = [message];

                message.populate({
                    path: '_sender',
                    select: '-_id username'
                }, function(err, message) {
                    if (err) {
                        done(err);
                    } else {
                        done(null, conversation);
                    }
                })
            }, function(err, conversation_arrray) {
                if (err) {
                    console.log(err);
                    res.send(new Error('Cannot create array'));
                } else {
                    res.json(conversation_arrray);
                }
            });
        });
    });
};

function getConversation(req, res, next) {
    console.log(req.query);

    if (!req.params || !req.params.id) {
        res.status(400).send('Invalid request');
        return;
    }    

    db.conversationModel.findById(req.params.id).select('-__v')
        .populate({
            path: 'messages',
            select: '-_id _sender sendTime text',
            options: {
                sort: { 'sendTime': -1 }
            }
        }).populate({
            path: 'users',
            select: '-_id username'
        }).exec(function(err, conversation) {
            if (err) {
                console.log(err);
                res.send(new Error('Error finding conversations'));
                return;    
            }
            if (!conversation) {
                res.send(new Error('Conversation not found'));
                return;
            }

            async.map(conversation.messages, function(message, done) {
                message.populate({
                    path: '_sender',
                    select: '-_id username'
                }, function(err, message) {
                    if (err) {
                        done(err);
                    } else {
                        done(null, message);
                    }
                });
            }, function(err, message_array) {
                if (err) {
                    console.log(err);
                    res.send(new Error('Cannot create array'));
                } else {
                    res.send(conversation);
                }
            });
        });
}

function createConversation(req, res, next) {
    console.log(req.body);
    if (!req.body || !req.body.users || req.body.users.length < 2) {
        res.status(400).send('Invalid request');
        return;     
    }

    // TODO: Check if array of users has unique values

    db.userModel.find({}).where('username').in(req.body.users).exec(function(err, users) {
        if (users.length != req.body.users.length) {
            for (var user = 0; user < users.length; user++) {
                if (req.body.users.indexOf(users[user].username) < 0) {
                    res.send("Error: User " + users[user].username + " not found");
                    return;
                }
            }

            res.send("Error: Unknown user search error")
            return;
        }

        var newConversation = new db.conversationModel({
            name: req.body.name ? req.body.name : "No Name",
            users: [],
            messages: [],
            latestActive: (new Date).getTime()
        });

        for (var user = 0; user < users.length; user++) {
            newConversation.users.push(users[user]._id);
        }

        newConversation.save(function (err, conversation) {
            if(err) {
                console.log(err);
                res.send("Error Creating");
            } else {
                for (var user = 0; user < users.length; user++) {
                    users[user].conversations.push(conversation._id);
                    users[user].save(function(err) {
                        if (err) console.log(err);
                    });
                }
                res.send(conversation._id);
            }
        });
    });
};

function sendMessage(req, res, next) {
    console.log(req.body);
    if (!req.body || !req.body.conversationId || !req.body.text) {
        res.status(400).send('Invalid request');
        return;    
    }

    db.userModel.findOne({username: req.body.username}).populate('conversations').exec(function(err, user) {
        if (err) {
            res.send(err);
            return;
        }
        if (!user) {
            res.send("Error: user not found");
            return;
        }

        var conversation;
        for (var convo = 0; convo < user.conversations.length && !conversation; convo++) {
            console.log(user.conversations[convo] + " " + req.body.conversationId) 
            if (user.conversations[convo]._id == req.body.conversationId) {
                conversation = user.conversations[convo];
            }
        }

        if (!conversation) {
            res.send("Error: user is not part of this conversation");
            return;
        }
            
        var newMessage = new db.messageModel({
            _sender: user.id,
            _conversation: conversation._id,
            sendTime: req.body.sendTime ? req.body.sendTime : (new Date).getTime(),
            text: req.body.text
        });

        newMessage.save(function(err, message) {
            if (err) {
                console.log(err);
                res.send("Error: Message cannot be saved");
            } else {
                res.send(SUCCESS_RESULT);
                conversation.sendMessage(user, message);
            }
        });
    });
};

app.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});