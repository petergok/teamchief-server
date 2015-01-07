var mongoose = require ("mongoose");
var gcm = require('node-gcm');
var Constants = require('../constants');

var Schema = mongoose.Schema;
var sender = new gcm.Sender(Constants.GCM_API_KEY);

var conversationSchema = new Schema({
    name: {type: String, required: false},
    users: [{type: Schema.Types.ObjectId, ref: 'User'}],
    messages: [{type: Schema.Types.ObjectId, ref: 'Message'}]
});

conversationSchema.methods.sendMessage = function(sendingUser, message, res) {
    this.messages.push(message._id);

    this.save(function(err, conversation) {
        if (err) {
            console.log(err);
        } else {
            conversation.populate('users', function(err, sameConversation) {
                var gcmIds = [];
                for (var index = 0; index < conversation.users.length; index++) {
                    var user = conversation.users[index];
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

exports.model = mongoose.model('Conversation', conversationSchema);