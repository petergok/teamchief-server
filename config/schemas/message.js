var mongoose = require('mongoose')
var gcm = require('node-gcm');
var Schema = mongoose.Schema;

var MessageTypes = {
    "TEXT_MESSAGE": "TEXT_MESSAGE"
};

var messageSchema = new Schema({
    _sender: {type: Schema.Types.ObjectId, ref: 'User'},
    _conversation: {type: Schema.Types.ObjectId, ref: 'Conversation'},
    sendTime: {type: Number, required: true},
    text: {type: String, required: true}
});

messageSchema.methods.convertToGcmMessage = function() {
    return new gcm.Message({
        data: {
            messageType: MessageTypes.TEXT_MESSAGE,
            senderName: this._sender.username,
            sendTime: this.sendTime,
            text: this.text,
            conversationId: this._conversation._id
        }
    });
}

exports.model = mongoose.model('Message', messageSchema);