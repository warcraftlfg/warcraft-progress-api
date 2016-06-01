"use strict";

// Set module root directory and define a custom require function
process.root = __dirname;
process.require = function (filePath) {
    return require(path.normalize(process.root + "/app/" + filePath));
};

// Module dependencies
var path = require("path");
var async = require('async');
var mongo = require('mongodb').MongoClient;
var redis = require("redis");
var winston = require("winston");
var applicationStorage = process.require("core//applicationStorage");



var processNames = [];


// -port get the port number
if (process.argv.indexOf("-p") != -1) {
    var port = parseInt(process.argv[process.argv.indexOf("-p") + 1], 10);
    if (isNaN(port)) {
        port = 3000;
    }
}


// -ws start WebServerProcess
if (process.argv.indexOf("-ws") != -1) {
    processNames.push("WebServerProcess");
}

// -au start AuctionUpdateProcess
if (process.argv.indexOf("-au") != -1) {
    processNames.push("AuctionUpdateProcess");
}

// -gu start GuildUpdateProcess
if (process.argv.indexOf("-gu") != -1) {
    processNames.push("GuildUpdateProcess");
}

// -cu start CharacterUpdateProcess
if (process.argv.indexOf("-cu") != -1) {
    processNames.push("CharacterUpdateProcess");
}

// -gpu start GuildProgressUpdateProcess
if (process.argv.indexOf("-gpu") != -1) {
    processNames.push("GuildProgressUpdateProcess");
}


//Load config file
var env = process.env.NODE_ENV || "development";
var config = process.require("config/config.json");

var logger = null;

async.waterfall([
    //Load the config file
    function (callback) {
        applicationStorage.config = config;
        callback();
    },
    //Initialize the logger
    function (callback) {
        var transports = [
            new (require("winston-daily-rotate-file"))({
                filename: config.logger.folder + "/" + env + ".log",
                json: false,
                handleExceptions: true,
                formatter: function (options) {
                    // Return string will be passed to logger.
                    return new Date().toString() + ' - ' + process.pid + ' - ' + options.level.toUpperCase() + ' - ' + (undefined !== options.message ? options.message : '') +
                        (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' );
                }
            })];
        if (env == "development") {
            transports.push(new (winston.transports.Console)({handleExceptions: true}));
        }

        applicationStorage.logger = logger = new (winston.Logger)({
            level: config.logger.level,
            transports: transports
        });

        callback();
    },
    // Establish a connection to the database
    function (callback) {
        async.parallel([
                function (callback) {
                    mongo.connect(config.database.mongo, function (error, db) {
                        logger.verbose("Mongo connected");
                        applicationStorage.mongo = db;
                        callback(error);

                    });
                },
                function (callback) {
                    var db = redis.createClient(config.database.redis);
                    db.on("error", function (error) {
                        callback(error);
                    });

                    db.on("ready", function () {
                        logger.verbose("Redis connected");
                        applicationStorage.redis = db;
                        callback();
                    });
                }
            ],
            function (error) {
                callback(error)
            });
    },
    //Create instance of processes
    function (callback) {
        var processes = [];
        async.forEachSeries(processNames, function (processName, callback) {
            var obj = process.require("process/" + processName + ".js");
            processes.push(new obj(port));
            callback();
        }, function () {
            callback(null, processes);
        });
    },
    // Start Processes
    function (processes, callback) {
        async.each(processes, function (process, callback) {
            process.start(function (error) {
                callback(error);
            });
        }, function (error) {
            callback(error);
        });
    }
], function (error) {
    if (error) {
        logger.error(error);
    }
});