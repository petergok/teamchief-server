var db = require('../model/dbschema.js');
var async = require('async');

var SUCCESS_RESULT = "Request Successful";

exports.login = function(req, res, next) {
    res.send(SUCCESS_RESULT);
}

exports.registerNewUser = function(req, res, next) {
    console.log(req.body);
    if (!req.body || !req.body.gcmId || !req.body.username || !req.body.email 
        || !req.body.password) {
        res.status(400).send('Invalid request');
        return;
    }

    var newUser = new db.userModel({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        gcmId: req.body.gcmId,
        teams: []
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

exports.updateRegistrationId = function(req, res, next) {
    console.log(req.body);
    if (!req.body || !req.body.gcmId) {
        res.status(400).send('Invalid request');
        return;   
    }

    db.userModel.findOne({username: req.body.username}).exec(function(err, user) {
        user.gcmId = req.body.gcmId;
        user.save(function(err) {
            if (err) {
                console.log(err);
                res.send("Error updating");
            } else {
                res.send(SUCCESS_RESULT);
            }
        })
    })
}

exports.getTeams = function(req, res, next) {
    console.log(req.query);

    db.userModel.findOne({username: req.query.username}).exec(function(err, user) {
        if (err) {
            console.log(err);
            res.send('Error finding user');
            return;
        }

        db.teamModel.find({}).where('_id').select('-__v').in(user.teams).sort('-latestActive')
        .populate({
            path: 'messages',
            select: 'sender sendTime text',
            options: {
                limit: 1,
                sort: { 'sendTime': -1 }
            }
        }).populate({
            path: 'users',
            select: '-_id username'
        }).exec(function(err, teams) {
            if (err) {
                console.log(err);
                res.send('Error finding teams');
                return;    
            }
            if (!teams) {
                res.send({});
                return;
            }

            async.map(teams, function(team, done) {
                if (!team.messages[0]) {
                    return done(null, team);
                }

                var message = team.messages[0];
                team.messages = [message];

                message.populate({
                    path: 'sender',
                    select: '-_id username'
                }, function(err, message) {
                    if (err) {
                        done(err);
                    } else {
                        done(null, team);
                    }
                })
            }, function(err, team_array) {
                if (err) {
                    console.log(err);
                    res.send('Error: Cannot create team array');
                } else {
                    res.json(team_array);
                }
            });
        });
    });
};

exports.getTeam = function(req, res, next) {
    console.log(req.query);

    if (!req.params || !req.params.id) {
        res.status(400).send('Invalid request');
        return;
    }

    var populateMessagesOptions = {
        path: 'messages',
        select: 'sender sendTime text',
        options: {
            limit: 50,
            sort: { 'sendTime': -1 }
        }
    }

    if (req.query.after) {
        populateMessagesOptions.match = { sendTime: {$gte: req.query.after}};
        populateMessagesOptions.options.limit = 10000;
    } else if (req.query.before) {
        populateMessagesOptions.match = { sendTime: {$lte: req.query.before}};
    }

    db.teamModel.findById(req.params.id).select('-__v')
        .populate(populateMessagesOptions).populate({
            path: 'users',
            select: '-_id username'
        }).exec(function(err, team) {
            if (err) {
                console.log(err);
                res.send('Error finding teams');
                return;    
            }
            if (!team) {
                res.send('Team not found');
                return;
            }

            var inTeam = false;
            for (var user = 0; user < team.users.length && !inTeam; user++) {
                if (team.users[user].username == req.query.username) {
                    inTeam = true;
                }
            }

            if (!inTeam) {
                res.send('User not in team');
            }

            async.map(team.messages, function(message, done) {
                message.populate({
                    path: 'sender',
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
                    res.send('Error: cannot create message array');
                } else {
                    res.send(team);
                }
            });
        });
}

exports.createTeam = function(req, res, next) {
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

            res.send("Error: Unknown user search error");
            return;
        }

        var newTeam = new db.teamModel({
            name: req.body.name ? req.body.name : "No Name",
            users: [],
            messages: [],
            latestActive: (new Date).getTime()
        });

        for (var user = 0; user < users.length; user++) {
            newTeam.users.push(users[user]._id);
        }

        newTeam.save(function (err, team) {
            if(err) {
                console.log(err);
                res.send("Error Creating");
            } else {
                for (var user = 0; user < users.length; user++) {
                    users[user].teams.push(team._id);
                    users[user].save(function(err) {
                        if (err) console.log(err);
                    });
                }
                res.send(team._id);
            }
        });
    });
};

exports.sendMessage = function(req, res, next) {
    console.log(req.body);
    if (!req.body || !req.body.teamId || !req.body.text) {
        res.status(400).send('Invalid request');
        return;    
    }

    db.userModel.findOne({username: req.body.username}).populate('teams').exec(function(err, user) {
        if (err) {
            res.send(err);
            return;
        }
        if (!user) {
            res.send("Error: user not found");
            return;
        }

        var team;
        for (var index = 0; index < user.teams.length && !team; index++) {
            console.log(user.teams[index] + " " + req.body.teamId) 
            if (user.teams[index]._id == req.body.teamId) {
                team = user.teams[index];
            }
        }

        if (!team) {
            res.send("Error: user is not part of this team");
            return;
        }
            
        var newMessage = new db.messageModel({
            sender: user.id,
            team: team._id,
            sendTime: req.body.sendTime ? req.body.sendTime : (new Date).getTime(),
            text: req.body.text
        });

        newMessage.save(function(err, message) {
            if (err) {
                console.log(err);
                res.send("Error: Message cannot be saved");
            } else {
                res.send(SUCCESS_RESULT);
                team.sendMessage(user, message);
            }
        });
    });
};