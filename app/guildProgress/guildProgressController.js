"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");
var guildProgressModel = process.require("guildProgress/guildProgressModel.js");
var guildModel = process.require("guilds/guildModel.js");


module.exports.getProgress = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var projection = {};
    projection["progress.tier_" + req.params.tier] = 1;

    guildProgressModel.find({
        region: req.params.region,
        realm: req.params.realm,
        name: req.params.name
    }, projection, function (error, guilds) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (guilds && guilds.length > 0 && guilds[0]['progress'] && guilds[0]['progress']["tier_" + req.params.tier]) {
            res.json(guilds[0]["progress"]["tier_" + req.params.tier]);
        } else {
            next();
        }
    });
};

module.exports.getProgressSimple = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var projection = {};
    projection["progress.tier_" + req.params.tier + ".normalCount"] = 1;
    projection["progress.tier_" + req.params.tier + ".heroicCount"] = 1;
    projection["progress.tier_" + req.params.tier + ".mythicCount"] = 1;

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

module.exports.searchGuild = function (req, res) {
    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.query));

    if (req.params.text.length >= 3) {

        var limit = 0;
        if (req.query.number) {
            limit = parseInt(req.query.number, 10);

            if (isNaN(limit)) {
                return;
            }

            limit = limit < 0 ? 0 : limit;
        }
        async.waterfall([
            function (callback) {
                guildProgressModel.find({name: {$regex: "^" + req.params.text, $options: "i"}},
                    {region: 1, realm: 1, name: 1, _id: 0},
                    {name: 1}, limit,
                    function (error, guilds) {
                        callback(error, guilds);
                    }
                );
            },
            function (guilds, callback) {
                async.each(guilds, function (guild, callback) {
                    guildModel.getGuildInfo(guild.region, guild.realm, guild.name, function (error, guild) {
                        if (guild && guild.bnet && guild.bnet.side != null) {
                            guild["side"] = guild.bnet.side;
                        }
                        if (guild && guild.ad && guild.ad.lfg == true) {
                            guild["lfg"] = true;
                        }
                        callback(error);
                    });

                }, function (error) {
                    callback(error, guilds);
                })
            }
        ], function (error, guilds) {
            if (error) {
                logger.error(error.message);
                res.status(500).send(error.message);
            } else {
                res.json(guilds);
            }
        });

    }
    else {
        res.json([]);
    }
};