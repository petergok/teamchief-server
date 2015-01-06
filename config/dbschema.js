var mongoose = require ("mongoose");
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;

exports.mongoose = mongoose;

var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/NewDatabase';

mongoose.connect(uristring, function (err, res) {
  if (err) {
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + uristring);
  }
});

var Schema = mongoose.Schema;

var message, conversation, userSchema;

messageSchema = new Schema({
    sender: {type: Schema.Types.ObjectId, ref: 'User'},
    conversation: {type: Schema.Types.ObjectId, ref: 'Conversation'},
    sendTime: {type: Number, required: true},
    text: {type: String, required: true}
})

conversationSchema = new Schema({
    convoId: {type: String, required: true, unique: true},
    name: {type: String, required: false},
    users: [{type: Schema.Types.ObjectId, ref: 'User'}],
    messages: [{type: Schema.Types.ObjectId, ref: 'Message'}]
})

userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: false },
  password: { type: String, required: false},
  gcmId: {type: String, required: false},
  gcmIdAppVersion: {type: String, required: false},
  conversations: [{type: Schema.Types.ObjectId, ref: 'Conversation'}]
});

userSchema.pre('save', function(next) {
    var user = this;

    if(!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if(err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash) {
            if(err) return next(err);
            user.password = hash;
            next();
        });
    });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if(err) return cb(err);
        cb(null, isMatch);
    });
};

var userModel = mongoose.model('User', userSchema);
var messageModel = mongoose.model('Message', messageSchema);
var conversationModel = mongoose.model('Conversation', conversationSchema);

userModel.remove({}, function(err) { 
   console.log('collection removed') 
});

exports.messageModel = messageModel;
exports.conversationModel = conversationModel;
exports.userModel = userModel;