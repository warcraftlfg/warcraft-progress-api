"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var mythicDungeonModel = process.require("mythicDungeons/mythicDungeonModel.js");
var realmModel = process.require("realms/realmModel.js");

module.exports.getRanking = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params), JSON.stringify(req.query));

    var criteria = {};

    if (req.query && req.query.region) {
        criteria.region = req.query.region;
    }

    if (req.query && req.query.affixes) {
        criteria.affixes = req.query.affixes.split('#');
    }

    if (req.query && req.query.dungeon) {
        criteria.dungeon = req.query.dungeon;
    }

    var limit;
    if (req.query && req.query.limit) {
        limit = parseInt(req.query.limit, 10);

        if (limit < 0) {
            limit = 50;
        }

        if (limit > 50) {
            limit = 50;
        }

    } else {
        limit = 50;
    }


    async.waterfall([
            function (callback) {
                if (req.query && req.query.region && req.query.locale) {
                    var localeArray = req.query.locale.split('#');
                    if (localeArray.length == 2) {
                        realmModel.find({
                            "bnet.locale": localeArray[0],
                            "bnet.timezone": {$regex: "^" + localeArray[1], $options: "i"}
                        }, {name: 1}, function (error, realms) {
                            if (realms.length > 0) {
                                criteria["$or"] = [];
                                realms.forEach(function (realm) {
                                    criteria['$or'].push({realms: realm.name});
                                });
                                criteria['realms'] = {$exists:true};
                                callback();
                            } else {
                                callback();
                            }
                        });
                    } else {
                        callback();
                    }
                } else {
                    callback();
                }
            },
            function (callback) {
                if (req.query && req.query.region && req.query.realm) {
                    realmModel.findOne({
                        region: req.query.region,
                        name: req.query.realm
                    }, {connected_realms: 1}, function (error, realm) {
                        if (realm) {
                            criteria["$or"] = [];
                            realm.connected_realms.forEach(function (realmName) {
                                criteria['$or'].push({realms: realmName});
                            });
                            criteria['realms'] = {$exists:true};
                            callback();

                        } else {
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            },
            function (callback) {
                mythicDungeonModel.find(req.params.extension, criteria, limit, function (error, runs) {
                    callback(error, runs);
                });
            }

        ],
        function (error, runs) {
            if (error) {
                logger.error(error.message);
                res.status(500).send(error.message);
            } else if (runs && runs.length > 0) {
                res.json(runs);
            } else {
                next();
            }
        }
    );
};