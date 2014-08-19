"use strict";

var _ = require("underscore");
var crypto = require("crypto");
var models = require("./models");

// create new message
//var message = new Message();
//message.date = new Date();    --- set date
//message.message = "hello2";   --- set message
/* message.save(function(){            --- save message to database
    console.log("Sucessfully saved");  
});*/

var database = {
    clients: {
        officialApiClient: { secret: "C0FFEE" },
        unofficialClient: { secret: "DECAF" }
    },
    tokensToClientIds: {}
};

function generateToken(data) {
    var random = Math.floor(Math.random() * 100001);
    var timestamp = (new Date()).getTime();
    var sha256 = crypto.createHmac("sha256", random + "WOO" + timestamp);

    return sha256.update(data).digest("base64");
}

exports.grantClientToken = function (credentials, req, cb) {
    /*
    console.log("username: " + req.username);
    console.log("password: " + req.authorization);
    var isValid1 = models.User.findOne({username: req.username}, function (err, user){
        console.log(user);
        return user;
    }) ;
    var isValid2 = isValid1.password === credentials.password;

    var isValid = isValid1 && isValid2;

    console.log(isValid);
    */
    var isValid = _.has(database.clients, credentials.clientId) &&
                  database.clients[credentials.clientId].secret === credentials.clientSecret;
    if (isValid) {
        // If the client authenticates, generate a token for them and store it so `exports.authenticateToken` below
        // can look it up later.

        var token = generateToken(credentials.clientId + ":" + credentials.clientSecret);
        database.tokensToClientIds[token] = credentials.clientId;

        // Call back with the token so Restify-OAuth2 can pass it on to the client.
        return cb(null, token);
    }

    // Call back with `false` to signal the username/password combination did not authenticate.
    // Calling back with an error would be reserved for internal server error situations.
    cb(null, false);
};

exports.authenticateToken = function (token, req, cb) {
    if (_.has(database.tokensToClientIds, token)) {
        // If the token authenticates, set the corresponding property on the request, and call back with `true`.
        // The routes can now use these properties to check if the request is authorized and authenticated.
        req.clientId = database.tokensToClientIds[token];
        return cb(null, true);
    }

    // If the token does not authenticate, call back with `false` to signal that.
    // Calling back with an error would be reserved for internal server error situations.
    cb(null, false);
};
