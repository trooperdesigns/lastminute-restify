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
    TOKEN: "/token", // also the login and callback after signup
    PUBLIC: "/public",
    SECRET: "/secret",
    USERS: "/users",
    EVENTS: "/events"
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

// use this as example for "needs auth token"
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
// TODO: see someone's info who isn't the person who was authenticated --> only see basic info, i.e. username, name, etc.
server.get(RESOURCES.USERS + "/:id", function (req, res){

    models.User.findOne({_id : req.params.id}, function(err, user){
        if(user){
            res.send(user);
        } else {
            res.send(404);
        }
    });
});

// signup / create new user
server.post(RESOURCES.USERS, function (req, res, next){
    res.contentType = "application/hal+json";

    //console.log(req.body.username);

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
                    console.log("could not save user");
                }
            });
        } else {
            console.log("User already exists");
            res.send(200);
        }
    });
});

// update user info
// user has to be authenticated with the same clientId
server.put(RESOURCES.USERS + "/:id", function (req, res, next){
    res.contentType = "application/hal+json";

    models.User.findOne({_id : req.params.id}, function (err, user){
        //console.log("req id: " + req.clientId);
        //console.log("params id: " + user.username);
        if (user) {
            if(user.username === req.clientId){
                console.log("Edit allowed");
            } else {
                console.log("Edit not allowed");
            }
        }
    });
});

// get list of all events
server.get(RESOURCES.EVENTS, function (req, res, next){

    console.log("clientId: " + req.clientId);

    if (!req.username) {
        return res.sendUnauthenticated();
    }

    res.contentType = "application/hal+json";
    
    /*if (!req.username) {
        return res.sendUnauthenticated();
    }*/

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
server.post(RESOURCES.EVENTS, function (req, res, next){

    if (!req.username) {
        return res.sendUnauthenticated();
    }

    res.contentType = "application/hal+json";

    console.log(req.body.name);

    var newEvent = new models.Event();
    newEvent.name = req.body.name;
    newEvent.creator = req.clientId;
    newEvent.date = new Date(req.body.date);
    newEvent.location = req.body.location;
    newEvent.created = Date.now();
    newEvent.usersInvited = req.body.usersInvited;
    newEvent.save(function(err){
        if(!err){
            console.log("Event: " + newEvent.name + " created successfully");
            res.send(newEvent);
        } else {
            console.log("Error creating event");
            res.send(400);
        }
    });
});

// update event info
server.put(RESOURCES.EVENTS + "/:id", function (req, res, next){
    res.contentType = "application/hal=json";

    if (!req.username) {
        return res.sendUnauthenticated();
    }

    var name = req.body.name;
    var date = req.body.date;

    res.send(req.authorization);
});

// remove event by id, returns deleted event
// should only be able to be deleted by creator
server.del(RESOURCES.EVENTS + "/:id", function rm(req, res, next){

    if (!req.clientId) {
        return res.sendUnauthenticated();
    }

    models.Event.findOne({_id : req.params.id}, function(err, lmevent){
        console.log("creator: " + lmevent.creator + "  username: " + req.clientId);
        if(lmevent){
            if(lmevent.creator === req.username){
                res.send(lmevent);
                lmevent.remove();
            } else {
                res.send("You are not the creator. Cannot delete event");
            }            
        } else {
            res.send("Could not find event");
        }
        // if event creator = user who sent request, delete

    });
    
});

server.listen(8080, function(){
    console.log("Listening on port: " + 8080)
});
