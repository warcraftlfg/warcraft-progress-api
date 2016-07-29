"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var rankModel = process.require("ranks/rankModel.js");
var realmModel = process.require("realms/realmModel.js");
var guildModel = process.require("guilds/guildModel.js");

module.exports.getRank = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    async.parallel({
        world: function (callback) {
            rankModel.getRank(req.params.tier, req.params.region, req.params.realm, req.params.name, function (error, rank) {
                callback(error, rank)
            });
        },
        region: function (callback) {
            rankModel.getRank(req.params.tier + "_" + req.params.region, req.params.region, req.params.realm, req.params.name, function (error, rank) {
                callback(error, rank)
            });
        },
        realm: function (callback) {
            realmModel.findOne({
                region: req.params.region,
                name: req.params.realm
            }, {connected_realms: 1}, function (error, realm) {
                if (realm) {
                    rankModel.getRank(req.params.tier + "_" + req.params.region + "_" + realm.connected_realms.join('_'), req.params.region, req.params.realm, req.params.name, function (error, rank) {
                        callback(error, rank)
                    });
                } else {
                    logger.warn("Realm %s-%s not found", req.params.region, req.params.realm);
                    callback(error);
                }
            });
        }
    }, function (error, result) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (result.world !== null && result.region != null) {
            result.world++;
            result.region++;
            if (result.realm != null)
                result.realm++;
            res.json(result);
        } else {
            next();
        }
    });
};


module.exports.getRanking = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var start = 0;
    if (req.query && req.query.start) {
        start = parseInt(req.query.start, 10) > 0 ? parseInt(req.query.start, 10) - 1 : 0
    }

    var end = start + 500;
    if (req.query && req.query.limit) {
        var limit = parseInt(req.query.limit, 10);

        if (limit < 0)
            limit = 500;

        if (limit > 1000)
            limit = 1000;

        end = start + limit;
    }

    async.waterfall([
        function (callback) {
            var key = req.params.tier;
            if (req.params.realm && req.params.region) {
                realmModel.findOne({
                    region: req.params.region,
                    name: req.params.realm
                }, {connected_realms: 1}, function (error, realm) {
                    if (realm) {
                        key = req.params.tier + "_" + req.params.region + "_" + realm.connected_realms.join('_');
                        callback(error, key);
                    } else {
                        callback(new Error("Realm %s-%s not found", req.params.region, req.params.realm));
                    }
                });
            } else if (req.params.region) {
                key = req.params.tier + "_" + req.params.region;
                callback(null, key);
            } else {
                callback(null, key);
            }
        },
        function (key, callback) {
            rankModel.getRanking(key, start, end, function (error, ranking) {
                callback(error, ranking);
            });
        }
    ], function (error, ranking) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (ranking) {
            var finalRanking = {};
            var counter = 1;
            async.each(ranking, function (rank, callback) {
                var rankArray = rank.split('-');

                //GET GUILD SIDE and add it
                guildModel.getSide(rankArray[0],rankArray[1],rankArray[2],function(error,guild){
                    finalRanking[start + counter] = {region: rankArray[0], realm: rankArray[1], name: rankArray[2]};
                    if(guild && guild.bnet && guild.bnet.side ){
                        finalRanking[start + counter]["side"] = guild.bnet.side;
                    }
                    counter++;
                    callback();
                });

            }, function () {
                res.json(finalRanking);
            });
        } else {
            next();
        }
    });

};