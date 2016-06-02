"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");
var guildModel = process.require("guilds/guildModel.js");

module.exports.getGuild = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));
    guildModel.find({
        region: req.params.region,
        realm: req.params.realm,
        name: req.params.name
    }, function (error, guild) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (guild !== null) {
            res.json(guild);
        } else {
            next();
        }
    });
};