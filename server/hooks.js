"use strict";

var _ = require("underscore");
var crypto = require("crypto");
var models = require("./models");

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
    
    console.log("username: " + credentials.clientId);
    console.log("password: " + credentials.clientSecret);
    var isValid = models.User.findOne({username: credentials.clientId, password: credentials.clientSecret}, function (err, user){
        // If the client authenticates, generate a token for them and store it so `exports.authenticateToken` below
        // can look it up later.

        if (user) {
            var token = generateToken(credentials.clientId + ":" + credentials.clientSecret);
            database.tokensToClientIds[token] = credentials.clientId;

            models.User.update({username : user.username}, {auth_token : token}, function (err){
                if(!err){
                    console.log("Authentication token granted: " + token);
                    return cb(null, token);
                }
            });            
        } else {
            // Call back with `false` to signal the username/password combination did not authenticate.
            // Calling back with an error would be reserved for internal server error situations.
            console.log("Error: did not authenticate");
            cb(null, false);
        }


    }) ;
};

exports.authenticateToken = function (token, req, cb) {

    var validToken = models.User.findOne({auth_token : token}, function (err, user){
        if (user) {
            // If the token authenticates, set the corresponding property on the request, and call back with `true`.
            // The routes can now use these properties to check if the request is authorized and authenticated.
            console.log("Token valid for: " + user.username);
            req.clientId = user.username;
            return cb(null, true);
        }
        // If the token does not authenticate, call back with `false` to signal that.
        // Calling back with an error would be reserved for internal server error situations.
        cb(null, false);        
    });
};
