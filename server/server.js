"use strict";

var restify = require("restify");
var restifyOAuth2 = require("../");
var hooks = require("./hooks");
var models = require("./models");


// NB: we're using [HAL](http://stateless.co/hal_specification.html) here to communicate RESTful links among our
// resources, but you could use any JSON linking format, or XML, or even just Link headers.

var server = restify.createServer({
    name: "Example Restify-OAuth2 Client Credentials Server",
    version: require("../package.json").version,
    formatters: {
        "application/hal+json": function (req, res, body) {
            return res.formatters["application/json"](req, res, body);
        }
    }
});

var RESOURCES = Object.freeze({
    INITIAL: "/",
    TOKEN: "/token",
    PUBLIC: "/public",
    SECRET: "/secret",
    USERS: "/users",
    EVENTS: "/events",
    LOGIN: "/login"
});

server.use(restify.authorizationParser());
server.use(restify.bodyParser({mapParams: false}));
server.use(restify.queryParser());
restifyOAuth2.cc(server, { tokenEndpoint: RESOURCES.TOKEN, hooks: hooks });

server.get(RESOURCES.INITIAL, function (req, res) {
    var response = {
        _links: {
            self: { href: RESOURCES.INITIAL },
            "http://localhost:8080/public": { href: RESOURCES.PUBLIC }
        }
    };

    if (req.clientId) {
        response._links["http://localhost:8080/secret"] = { href: RESOURCES.SECRET };
    } else {
        response._links["oauth2-token"] = {
            href: RESOURCES.TOKEN,
            "grant-types": "client_credentials",
            "token-types": "bearer"
        };
    }

    res.contentType = "application/hal+json";
    res.send(response);
});

server.get(RESOURCES.PUBLIC, function (req, res) {
    res.send({
        "public resource": "is public",
        "it's not even": "a linked HAL resource",
        "just plain": "application/json",
        "personalized message": req.clientId ? "hi, " + req.clientId + "!" : "hello stranger!"
    });
});

// use this example for "need token"
server.get(RESOURCES.SECRET, function (req, res) {
    if (!req.clientId) {
        return res.sendUnauthenticated();
    }

    var response = {
        "clients with a token": "have access to this secret data",
        _links: {
            self: { href: RESOURCES.SECRET },
            parent: { href: RESOURCES.INITIAL }
        }
    };

    res.contentType = "application/hal+json";
    res.send(response);
});

// get list of all users
server.get(RESOURCES.USERS, function (req, res){
    res.contentType = "application/hal+json";

    models.User.find({}, function(err, users){
        //console.log(users[0]);
        res.send(users);
    });

});

// get single user
server.get(RESOURCES.USERS + "/:id", function (req, res){

    models.User.findOne({_id : req.params.id}, function(err, user){
        if(!err){
            res.send(user);
        } else {
            res.send(404);
        }

        
    });
});

// signup / create new user
server.post(RESOURCES.USERS, function (req, res, next){
    res.contentType = "application/hal+json";

    console.log(req.body.username);

    models.User.findOne({username: req.body.username}, function(err, user){

        if(!user){
            var user = new models.User();
            user.username = req.body.username;
            user.password = req.body.password;
            user.email = req.body.email;
            user.created = Date.now();

            user.save(function(err){
                if(!err){
                    console.log("User: " + user.username + " saved successfully");
                    res.send(201);
                } else {
                    console.log("error");
                }
            });
        } else {
            console.log("User already exists");
            res.send(200);
        }
    });
});

// get list of all events
server.get(RESOURCES.EVENTS, function (req, res){

    if (!req.clientId) {
        return res.sendUnauthenticated();
    }

    res.contentType = "application/hal+json";

    models.Event.find({}, function(err, events){
        res.send(events);
    });

});

// get single event
server.get(RESOURCES.EVENTS + "/:id", function (req, res){

    models.Event.findOne({_id : req.params.id}, function(err, lmevent){
        if(!err){
            res.send(lmevent);
        } else {
            res.send(404);
        }

        
    });
});

// create new event --> MUST BE SIGNED IN / HAVE AUTH TOKEN
server.post(RESOURCES.USERS, function (req, res, next){
    res.contentType = "application/hal+json";

    console.log(req.body.username);

    models.User.findOne({username: req.body.username}, function(err, user){

        if(!user){
            var user = new models.User();
            user.username = req.body.username;
            user.password = req.body.password;
            user.email = req.body.email;
            user.created = Date.now();

            user.save(function(err){
                if(!err){
                    console.log("User: " + user.username + " saved successfully");
                    res.send(201);
                } else {
                    console.log("error");
                }
            });
        } else {
            console.log("User already exists");
            res.send(200);
        }
    });
});

server.listen(8080, function(){
    console.log("Listening on port: " + 8080)
});
