"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");
var guildProgressModel = process.require("guildProgress/guildProgressModel.js");

module.exports.getProgress = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var projection = {};
    projection["progress.tier_"+req.params.tier] = 1;

    guildProgressModel.find({
        region: req.params.region,
        realm: req.params.realm,
        name: req.params.name
    }, projection, function (error, guilds) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (guilds && guilds.length > 0 && guilds[0]['progress'] && guilds[0]['progress']["tier_"+req.params.tier]) {
            res.json(guilds[0]["progress"]["tier_"+req.params.tier]);
        } else {
            next();
        }
    });
};

module.exports.getProgressSimple = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var projection = {};
    projection["progress.tier_"+req.params.tier+".normalCount"] = 1;
    projection["progress.tier_"+req.params.tier+".heroicCount"] = 1;
    projection["progress.tier_"+req.params.tier+".mythicCount"] = 1;

    guildProgressModel.find({
        region: req.params.region,
        realm: req.params.realm,
        name: req.params.name
    }, projection, function (error, guilds) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (guilds && guilds.length > 0) {
            res.json(guilds[0]);
        } else {
            next();
        }
    });
};