"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var rankModel = process.require("ranks/rankModel.js");
var realmModel = process.require("realms/realmModel.js");
var guildModel = process.require("guilds/guildModel.js");
var guildProgressModel = process.require("guildProgress/guildProgressModel.js");

module.exports.getRank = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    async.parallel({
        world: function (callback) {
            rankModel.getRank(req.params.tier, req.params.region, req.params.realm, req.params.name, function (error, rank) {
                if (rank != null) {
                    callback(error, rank + 1)
                } else {
                    callback(error, null)
                }
            });
        },
        region: function (callback) {
            rankModel.getRank(req.params.tier + "_" + req.params.region, req.params.region, req.params.realm, req.params.name, function (error, rank) {
                if (rank != null) {
                    callback(error, rank + 1)
                } else {
                    callback(error, null)
                }
            });
        },
        realmlocale: function (callback) {
            realmModel.findOne({
                region: req.params.region,
                name: req.params.realm
            }, {connected_realms: 1, "bnet.locale": 1, "bnet.timezone": 1}, function (error, realm) {
                if (realm && realm.connected_realms && realm.bnet && realm.bnet.locale && realm.bnet.timezone) {
                    async.parallel({
                        realm: function (callback) {
                            rankModel.getRank(req.params.tier + "_" + req.params.region + "_" + realm.connected_realms.join('_'), req.params.region, req.params.realm, req.params.name, function (error, rank) {
                                if (rank != null) {
                                    callback(error, rank + 1)
                                } else {
                                    callback(error, null)
                                }
                            });
                        },
                        locale: function (callback) {
                            var zoneArray = realm.bnet.timezone.split('/');
                            if(zoneArray.length > 0 ) {
                                rankModel.getRank(req.params.tier + "_" + realm.bnet.locale+"_"+zoneArray[0], req.params.region, req.params.realm, req.params.name, function (error, rank) {
                                    if (rank != null) {
                                        var result = {};
                                        result['rank'] = rank + 1;
                                        result['type'] = realm.bnet.locale+"_"+zoneArray[0];
                                        callback(error, result)
                                    } else {
                                        callback(error, null)
                                    }
                                });
                            }else {
                                callback(error,null);
                            }
                        }
                    }, function (error, result) {
                        if (result.realm != null && result.locale != null) {
                            callback(error, result);
                        } else {
                            callback(error, null);
                        }
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
        } else if (result && result.world !== null && result.region != null) {
            if (result.realmlocale != null) {
                result.realm = result.realmlocale.realm;
                result.locale = result.realmlocale.locale;
            }
            delete result.realmlocale;
            res.json(result);
        } else {
            next();
        }
    });
};


module.exports.getRanking = function (req, res, next) {

    var logger = applicationStorage.logger;
    var config = applicationStorage.config;

    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var start = 0;
    if (req.query && req.query.start) {
        start = parseInt(req.query.start, 10) > 0 ? parseInt(req.query.start, 10) - 1 : 0
    }

    var end = start + 500;
    if (req.query && req.query.limit) {
        var limit = parseInt(req.query.limit, 10);

        if (limit < 0) {
            limit = 50;
        }

        if (limit > 50) {
            limit = 50;
        }

        end = start + limit - 1;
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
            } else if (req.params.locale) {
                key = req.params.tier + "_" + req.params.locale;
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
            async.forEachSeries(ranking, function (rank, callback) {
                var rankArray = rank.split('-');

                //Fix realm with - ...
                if (rankArray.length == 4) {
                    rankArray[1] = rankArray[1] + "-" + rankArray[2];
                    rankArray[2] = rankArray[3];
                }

                finalRanking[start + counter] = {region: rankArray[0], realm: rankArray[1], name: rankArray[2]};
                async.parallel([
                    function (callback) {
                        //GET GUILD SIDE and add it
                        guildModel.getGuildInfo(rankArray[0], rankArray[1], rankArray[2], function (error, guild) {
                            if (guild && guild.bnet && guild.bnet.side != null) {
                                finalRanking[start + counter]["side"] = guild.bnet.side;
                            }
                            if (guild && guild.ad && guild.ad.lfg == true) {
                                finalRanking[start + counter]["lfg"] = true;
                            }
                            callback(error);
                        });
                    },
                    function (callback) {
                        //GET GUILD Progress and add it
                        var project = {};
                        config.progress.raids.forEach(function (raid) {
                            if (raid.tier == parseInt(req.params.tier, 10)) {
                                var difficulties = ["normal", "heroic", "mythic"];
                                difficulties.forEach(function (difficulty) {
                                    raid.bosses.forEach(function (boss) {
                                        project["progress.tier_" + req.params.tier + "." + difficulty + "." + boss.name] = {$size: {$ifNull: ["$progress.tier_" + req.params.tier + "." + difficulty + "." + boss.name + ".timestamps", []]}};
                                    });
                                });
                            }
                        });
                        project["progress.tier_" + req.params.tier + ".normalCount"] = 1;
                        project["progress.tier_" + req.params.tier + ".heroicCount"] = 1;
                        project["progress.tier_" + req.params.tier + ".mythicCount"] = 1;


                        guildProgressModel.aggregate({
                            region: rankArray[0],
                            realm: rankArray[1],
                            name: rankArray[2]
                        }, project, function (error, result) {

                            if (result && result.length > 0 && result[0]['progress'] && result[0]['progress']["tier_" + req.params.tier]) {
                                finalRanking[start + counter]["progress"] = result[0]["progress"]["tier_" + req.params.tier];
                            }
                            callback(error);
                        });


                    }
                ], function (error) {
                    counter++;
                    callback(error);
                })

            }, function (error) {
                if (error) {
                    logger.error(error.message);
                    res.status(500).send(error.message)
                } else {
                    res.json(finalRanking);
                }
            });
        } else {
            next();
        }
    });

};