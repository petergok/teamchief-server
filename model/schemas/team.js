var mongoose = require ("mongoose");
var gcm = require('node-gcm');
var Constants = require('../constants');

var Schema = mongoose.Schema;
var sender = new gcm.Sender(Constants.GCM_API_KEY);

var teamSchema = new Schema({
    name: {type: String, required: false},
    users: [{type: Schema.Types.ObjectId, ref: 'User'}],
    messages: [{type: Schema.Types.ObjectId, ref: 'Message'}],
    latestActive: {type: Number, required: true}
});

teamSchema.methods.sendMessage = function(sendingUser, message, res) {
    this.messages.push(message._id);
    this.latestActive = message.sendTime;

    this.save(function(err, team) {
        if (err) {
            console.log(err);
        } else {
            team.populate('users', function(err, sameTeam) {
                var gcmIds = [];
                for (var index = 0; index < team.users.length; index++) {
                    var user = team.users[index];
                    console.log(user.gcmId);
                    gcmIds.push(user.gcmId);
                }

                sender.send(message.convertToGcmMessage(), gcmIds, 4, function(err, result) {
                    console.log(result);
                    console.log(err);
                });
            })
        }
    });
};

exports.model = mongoose.model('Team', teamSchema);