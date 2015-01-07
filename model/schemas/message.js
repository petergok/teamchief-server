var mongoose = require('mongoose')
var gcm = require('node-gcm');
var Schema = mongoose.Schema;

var MessageTypes = {
    "TEXT_MESSAGE": "TEXT_MESSAGE"
};

var messageSchema = new Schema({
    sender: {type: Schema.Types.ObjectId, ref: 'User'},
    team: {type: Schema.Types.ObjectId, ref: 'Team'},
    sendTime: {type: Number, required: true},
    text: {type: String, required: true}
});

messageSchema.methods.convertToGcmMessage = function() {
    return new gcm.Message({
        data: {
            messageType: MessageTypes.TEXT_MESSAGE,
            senderName: this.sender.username,
            sendTime: this.sendTime,
            text: this.text,
            teamId: this.team._id
        }
    });
}

exports.model = mongoose.model('Message', messageSchema);