#!/usr/bin/env node
"use strict";

var _this = this;

exports.__esModule = true;

var events = require("events");

var crypto = require("crypto");

var cluster = require("cluster");

var express = require("express");

var parser = require("body-parser");

var os = require("os");

var fs = require("fs");

var session = require("express-session");

var jsonfile = require("jsonfile");

var compression = require("compression");

var shx = require("shelljs");

var argv = require("yargs").argv;

var name = argv.name || process.env.VALANCE_APP_NAME || process.env.HOSTNAME || "localhost";

var home = argv.home || process.env.VALANCE_APP_HOME || shx.pwd();

var port = argv.port || process.env.VALANCE_APP_PORT || process.env.PORT || 8080;

var mode = argv.mode || process.env.VALANCE_APP_MODE || process.env.NODE_MODE || "development";

if (cluster.isMaster) {
    var cores = os.cpus();
    for (var i = 0; i < cores.length; i++) {
        cluster.fork();
    }
    cluster.on("exit", function(worker) {
        cluster.fork();
    });
} else {
    var valance = express();
    valance.use(session({
        secret: crypto.createHash("sha1").digest("hex"),
        resave: false,
        saveUninitialized: false
    }));
    valance.use("/valance_modules", express.static(__dirname + "../node_modules"));
    valance.use("/assets", express.static(home + "/assets"));
    valance.use("/static", express.static(home + "/static"));
    valance.use("/", express.static(home + "/assets"));
    valance.set("view engine", "pug");
    valance.set("views", home);
    valance.use(require("express-redis")(6379, "127.0.0.1", {
        return_buffers: true
    }, "cache"));
    if (mode === "production") {
        if (!fs.existsSync(home + "/cache/")) shx.mkdir(home + "/cache/");
        if (!fs.existsSync(home + "/logs/")) shx.mkdir(home + "/logs/");
        valance.use(require("express-bunyan-logger")({
            name: name,
            streams: [ {
                level: "info",
                stream: process.stdout
            }, {
                level: "info",
                stream: process.stderr
            }, {
                level: "info",
                type: "rotating-file",
                path: home + ("/logs/" + name + "." + process.pid + ".json"),
                period: "1d",
                count: 365
            } ]
        }));
        valance.use(require("express-minify")({
            cache: home + "/cache"
        }));
        valance.use(compression());
    }
    var event_1 = new events.EventEmitter();
    event_1.on("synch", function() {
        _this;
    });
    valance.get("/:component", parser.urlencoded({
        extended: true
    }), function(req, res, next) {
        try {
            event_1.emit("synch", req.cache.set(name, JSON.stringify(jsonfile.readFileSync(home + ("/components/" + req.params.component + ".storage.json")))));
        } catch (err) {
            if (err) if (home + ("/components/" + req.params.component)) res.redirect("/errors");
        }
        try {
            req.cache.get("" + req.params.component, function(err, storage) {
                res.render(home + ("/components/" + req.params.component + ".template.pug"), JSON.parse(storage));
            });
        } catch (err) {
            if (err) res.redirect("/errors");
        }
    });
    valance.get("/:component/storage/objects.json", function(req, res, next) {
        event_1.emit("synch", req.cache.set(req.params.component, JSON.stringify(jsonfile.readFileSync(home + ("/components/" + req.params.component + ".storage.json")))));
        req.cache.get(req.params.component, function(err, storage) {
            res.json(JSON.parse(storage));
        });
    });
    valance.get("/:component/storage/:object/objects.json", function(req, res, next) {
        event_1.emit("synch", req.cache.set(req.params.component, JSON.stringify(jsonfile.readFileSync(home + ("/components/" + req.params.component + ".storage.json")))));
        req.cache.get(req.params.component, function(err, storage) {
            storage = JSON.parse(storage);
            if (req.params.object === "all") if (storage.objects) res.json(storage.objects);
            storage.objects.forEach(function(object) {
                if (req.params.object === "data") if (object.data) res.json(object.data);
                if (req.params.object === "alerts") if (object.alerts) res.json(object.alerts);
                if (req.params.object === "notifications") if (object.notifications) res.json(object.notifications);
                if (req.params.object === "history") if (object.history) res.json(object.history);
            });
        });
    });
    valance.all("*", function(req, res, next) {
        res.redirect("/index");
    });
    var portal = valance.listen(port, function() {
        console.log("Valance - Core: %s, Process: %sd, Name: %s, Home: %s, Port: %d", cluster.worker.id, process.pid, name, home, port);
    });
}