"use strict";

//Load dependencies
var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require("express");
var bodyParser = require("body-parser");
var compression = require('compression');
var applicationStorage = process.require('core/applicationStorage.js');

var logger = applicationStorage.logger;


/**
 * WebServer creates an HTTP server for the application,
 * which serves front and back end pages.
 * @class WebServerProcess
 * @constructor
 */
function WebServerProcess(port) {

    this.port = port || 3000;
    this.app = express();

    this.server = http.createServer(this.app);


    this.app.use(compression());
    this.app.use(bodyParser.urlencoded({extended: true}));
    this.app.use(bodyParser.json());

    //Initialize auth routes
    this.app.use(function (req, res, next) {
        if (req.path === '/')
            logger.info("%s GET /",  req.headers['x-forwarded-for'] || req.connection.remoteAddress);
        next();
    });

    //Initialize api v1 routes
    this.app.use('/api/v1', process.require("updates/routes.js"));
    this.app.use('/api/v1', process.require("ranks/routes.js"));
    this.app.use('/api/v1', process.require("guildProgress/routes.js"));
    this.app.use('/api/v1', process.require("kills/routes.js"));
    this.app.use('/api/v1', process.require("stats/routes.js"));



    //Log all other request and send 404
    this.app.use(function (req, res) {
        logger.error("Error 404 on request %s", req.url);
        res.status(404).send({error: 404, message: "The requested URL was not found on this server."});
    });
}

/**
 * Starts the HTTP server.
 * @method start
 */
WebServerProcess.prototype.start = function (callback) {
    logger.info("Starting WebServerProcess");
    // Start server
    var server = this.server.listen(this.port, function () {
        logger.info("Server HTTP listening on port %s", server.address().port);
        callback();
    });
};

module.exports = WebServerProcess;

