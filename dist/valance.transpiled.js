#!/usr/bin/env node
"use strict";
var _this = this;
exports.__esModule = true;
var events = require("events");
var crypto = require("crypto");
var cluster = require("cluster");
var os = require("os");
var express = require("express");
var session = require("express-session");
var parser = require("body-parser");
var jsonfile = require("jsonfile");
var compression = require("compression");
var shx = require("shelljs");
var pathExists = require("path-exists");
var argv = require("yargs").usage("Usage: $0 --name [appname] -root [/path/to/app/root]").argv;
var name = argv.name || process.env.VALANCE_NAME || "valance";
var root = argv.root || process.env.VALANCE_ROOT || shx.pwd();
var port = argv.port || process.env.VALANCE_PORT || process.env.PORT || 8080;
var mode = argv.mode || process.env.VALANCE_MODE || process.env.NODE_MODE || "development";
if (cluster.isMaster) {
    var cores = os.cpus();
    for (var i = 0; i < cores.length; i++) {
        cluster.fork();
    }
    cluster.on("exit", function (worker) {
        cluster.fork();
    });
}
else {
    var app = express();
    app.use(session({
        secret: crypto.createHash("sha1").digest("hex"),
        resave: false,
        saveUninitialized: false
    }));
    app.use("/valance/jquery", express.static(__dirname + "../node_modules/jquery/dist"));
    app.use("/jquery-ui", express.static(__dirname + "../node_modules/jquery-ui-dist"));
    app.use("/bootstrap", express.static(__dirname + "../node_modules/bootsrap/dist"));
    app.use("/bluebird", express.static(__dirname + "../node_modules/bluebird/js/browser"));
    app.use("/webcomponents.js", express.static(__dirname + "../node_modules/webcomponents.js"));
    app.use("/x-tag", express.static(__dirname + "../node_modules/x-tag/dist"));
    app.use("/assets", express.static(root + "/assets"));
    app.use("/static", express.static(root + "/static"));
    app.use("/", express.static(root + "/assets"));
    app.set("view engine", "pug");
    app.set("views", root);
    app.use(require("express-redis")(6379, "127.0.0.1", { return_buffers: true }, "cache"));
    if (mode === "production") {
        app.use(require("express-bunyan-logger")({
            name: name,
            streams: [
                {
                    level: "info",
                    stream: process.stdout
                },
                {
                    level: "info",
                    stream: process.stderr
                },
                {
                    level: "info",
                    type: "rotating-file",
                    path: __dirname + ("/logs/" + name + "." + process.pid + ".json"),
                    period: "1d",
                    count: 365
                }
            ]
        }));
        app.use(require("express-minify")({ cache: __dirname + "/cache" }));
        app.use(compression());
    }
    var event_1 = new events.EventEmitter();
    event_1.on("synch", function () { _this; });
    app.get("/:component", parser.urlencoded({ extended: true }), function (req, res, next) {
        try {
            event_1.emit("synch", req.cache.set(name, JSON.stringify(jsonfile.readFileSync(root + ("/components/" + req.params.component + ".storage.json")))));
        }
        catch (err) {
            if (err)
                if (root + ("/components/" + req.params.component))
                    res.redirect("/errors");
        }
        try {
            req.cache.get("" + req.params.component, function (err, storage) {
                res.render(root + ("/components/" + req.params.component + ".template.pug"), JSON.parse(storage));
            });
        }
        catch (err) {
            if (err)
                res.redirect("/errors");
        }
    });
    app.get("/:component/storage/objects.json", function (req, res, next) {
        event_1.emit("synch", req.cache.set(req.params.component, JSON.stringify(jsonfile.readFileSync(root + ("/components/" + req.params.component + ".storage.json")))));
        req.cache.get(req.params.component, function (err, storage) {
            res.json(JSON.parse(storage));
        });
    });
    app.get("/:component/storage/:object/objects.json", function (req, res, next) {
        event_1.emit("synch", req.cache.set(req.params.component, JSON.stringify(jsonfile.readFileSync(root + ("/components/" + req.params.component + ".storage.json")))));
        req.cache.get(req.params.component, function (err, storage) {
            storage = JSON.parse(storage);
            if (req.params.object === "all")
                if (storage.objects)
                    res.json(storage.objects);
            storage.objects.forEach(function (object) {
                if (req.params.object === "data")
                    if (object.data)
                        res.json(object.data);
                if (req.params.object === "alerts")
                    if (object.alerts)
                        res.json(object.alerts);
                if (req.params.object === "notifications")
                    if (object.notifications)
                        res.json(object.notifications);
                if (req.params.object === "history")
                    if (object.history)
                        res.json(object.history);
            });
        });
    });
    app.all("*", function (req, res, next) {
        res.redirect("/index");
    });
    /*
    app.get("/access", (req, res, next) => {

        event.emit("synch",
            req.cache.set("access",
                JSON.stringify(jsonfile.readFileSync(__dirname + "/app/components/access.storage.json"))))

        req.cache.get("access", (err, storage) => {
            res.render(__dirname + "/app/components/access.template.pug", JSON.parse(storage))
        })
    })

    app.post("/access", parser.urlencoded({ extended: true }), (req, res, next) => {

        // if (!req.body) return res.redirect("/")

        event.emit("synch",
            req.cache.set("access",
                JSON.stringify(jsonfile.readFileSync(__dirname + "/app/components/access.storage.json"))))

        if (req.body.email && req.body.password) {

            req.cache.get("access", (err, storage) => {

                storage = JSON.parse(storage)

                storage.objects.forEach(object => {

                    if (object.users) {
                        object.users.forEach(user => {

                            if (req.body.email === user.email) {
                                req.session.key = user.email
                                res.redirect("/dashboard")
                            }
                        })
                    }
                })
            })
            res.redirect("/access")
        }
        res.redirect("/")
    })

    app.get("/access/logout", (req, res, next) => {
        req.session = null
        res.redirect("/access")
    })

    app.get("/dashboard", (req, res, next) => {

        // if (!req.session.key) return res.redirect("/")

        event.emit("synch",
            req.cache.set("dashboard",
                JSON.stringify(jsonfile.readFileSync(__dirname + "/app/components/dashboard.storage.json"))))

        req.cache.get("dashboard", (err, storage) => {

            res.render(__dirname + "/app/components/dashboard.template.pug", JSON.parse(storage))
        })
    })
    */
    var portal = app.listen(port, function () {
        // let exec = require("child_process").execSync
        // let git = exec("git rev-parse --short master")
        // git = git.toString().trim()
        console.log("Valance: Thread %s, Name: %s, Root: %s, Port: %d", cluster.worker.id, name, root, port);
    });
}