"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");
var guildModel = process.require("guilds/guildModel.js");

module.exports.getGuild = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var projection = {};
    projection["progress.tier_"+req.params.tier] = 1;

    guildModel.find({
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