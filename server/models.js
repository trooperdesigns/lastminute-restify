var mongoose = require('mongoose');
var config = require('./config');

var db = mongoose.connect('mongodb://localhost:27017/restify', function (err){
    if (err){
        console.log("Error: could not connect to database");        
    } else {
        console.log("Successfully connected to database");
    }
}), Schema = mongoose.Schema;

// user model
var UserSchema = new Schema({
    id: Number,
    username: String,
    email: String,
    password: String,
    phone: String,
    eventInvites: Array,
    created: Date,
    parseUser: String,
    fbUser: String,
    googleUser: String,
    twitterUser: String,
    friendsList: Array,
    auth_token: String
});

// event model
var EventSchema = new Schema({
    creator: String,
    name: String,
    date: Date,
    location: String,
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    usersInvited: Array,
    usersAttending: Array,
    usersOnTheirWay: Array,
    usersNotAttending: Array

});

// mapping model name to schema
mongoose.model('User', UserSchema);
mongoose.model('Event', EventSchema);

// creating model variable
var User = mongoose.model('User');
var Event = mongoose.model('Event');


// create user "trooper" if doesn't exist
User.findOne({username: 'trooper'}, function(err, user){
    if(!user){
        var user = new User();
        user.username = "trooper";
        user.password = "designs";
        user.email = "trooper@designs.com";
        user.created = Date.now();
        user.auth_token = "";

        user.save(function(err){
            if(!err){
                console.log("User: " + user.username + " saved successfully");
            } else {
                console.log("error");
            }
        });
    }
});

// create user "trooper" if doesn't exist
Event.findOne({name: 'default'}, function(err, newEvent){
    if(!newEvent){
        var newEvent = new Event();
        newEvent.creator = "trooper";
        newEvent.name = "default";
        newEvent.date = new Date("2014-08-12");
        newEvent.location = "location 123";
        newEvent.created = Date.now();
        newEvent.usersInvited = ['person 1', 'person 2', 'person 3'];

        newEvent.save(function(err){
            if(!err){
                console.log("new event: " + newEvent.name + " saved successfully");
            } else {
                console.log("error");
            }
        });
    }
});
// exports
exports.User = User;
exports.Event = Event;

