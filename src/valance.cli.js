#!/usr/bin/env node
"use strict";
const events = require("events");
const crypto = require("crypto");
const cluster = require("cluster");
const express = require("express");
const parser = require("body-parser");
const os = require("os");
const fs = require("fs");
const session = require("express-session");
const jsonfile = require("jsonfile");
const compression = require("compression");
const shx = require("shelljs");
const argv = require("yargs").argv;
let name = argv.name || process.env.VALANCE_APP_NAME || process.env.HOSTNAME || "localhost";
let home = argv.home || process.env.VALANCE_APP_HOME || shx.pwd();
let port = argv.port || process.env.VALANCE_APP_PORT || process.env.PORT || 8080;
let mode = argv.mode || process.env.VALANCE_APP_MODE || process.env.NODE_MODE || "development";
if (cluster.isMaster) {
    let cores = os.cpus();
    for (let i = 0; i < cores.length; i++) {
        cluster.fork();
    }
    cluster.on("exit", worker => {
        cluster.fork();
    });
}
else {
    let valance = express();
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
    valance.use(require("express-redis")(6379, "127.0.0.1", { return_buffers: true }, "cache"));
    if (mode === "production") {
        if (!fs.existsSync(home + "/cache/"))
            shx.mkdir(home + "/cache/");
        if (!fs.existsSync(home + "/logs/"))
            shx.mkdir(home + "/logs/");
        valance.use(require("express-bunyan-logger")({
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
                    path: home + `/logs/${name}.${process.pid}.json`,
                    period: "1d",
                    count: 365
                }
            ],
        }));
        valance.use(require("express-minify")({ cache: home + "/cache" }));
        valance.use(compression());
    }
    let event = new events.EventEmitter();
    event.on("synch", () => { this; });
    valance.get("/:component", parser.urlencoded({ extended: true }), (req, res, next) => {
        try {
            event.emit("synch", req.cache.set(name, JSON.stringify(jsonfile.readFileSync(home + `/components/${req.params.component}.storage.json`))));
        }
        catch (err) {
            if (err)
                if (home + `/components/${req.params.component}`)
                    res.redirect("/errors");
        }
        try {
            req.cache.get(`${req.params.component}`, (err, storage) => {
                res.render(home + `/components/${req.params.component}.template.pug`, JSON.parse(storage));
            });
        }
        catch (err) {
            if (err)
                res.redirect("/errors");
        }
    });
    valance.get("/:component/storage/objects.json", (req, res, next) => {
        event.emit("synch", req.cache.set(req.params.component, JSON.stringify(jsonfile.readFileSync(home + `/components/${req.params.component}.storage.json`))));
        req.cache.get(req.params.component, (err, storage) => {
            res.json(JSON.parse(storage));
        });
    });
    valance.get("/:component/storage/:object/objects.json", (req, res, next) => {
        event.emit("synch", req.cache.set(req.params.component, JSON.stringify(jsonfile.readFileSync(home + `/components/${req.params.component}.storage.json`))));
        req.cache.get(req.params.component, (err, storage) => {
            storage = JSON.parse(storage);
            if (req.params.object === "all")
                if (storage.objects)
                    res.json(storage.objects);
            storage.objects.forEach(object => {
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
    valance.all("*", (req, res, next) => {
        res.redirect("/index");
    });
    const portal = valance.listen(port, () => {
        console.log("Valance - Core: %s, Process: %sd, Name: %s, Home: %s, Port: %d", cluster.worker.id, process.pid, name, home, port);
    });
}
