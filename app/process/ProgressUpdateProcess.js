"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var updateModel = process.require("updates/updateModel.js");
var updateService = process.require("updates/updateService.js");
var guildProgressModel = process.require("guildProgress/guildProgressModel.js");
var killModel = process.require("kills/killModel.js");
var rankModel = process.require("ranks/rankModel.js");
var realmModel = process.require("realms/realmModel.js");
var bnetAPI = process.require("core/api/bnet.js");

/**
 * ProgressUpdateProcess constructor
 * @constructor
 */
function ProgressUpdateProcess() {

}

/**
 * Update Guild Progress
 */
ProgressUpdateProcess.prototype.updateGuildProgress = function () {

    var logger = applicationStorage.logger;
    var config = applicationStorage.config;
    var self = this;

    async.waterfall([
            function (callback) {
                //Get next guild to update
                updateService.getNextUpdate('wp_pu', function (error, guildProgress) {
                    if (guildProgress == null) {
                        //Guild update is empty
                        logger.info("No guild progress to update ... waiting 3 sec");
                        setTimeout(function () {
                            callback(true);
                        }, 3000);
                    } else {
                        logger.info("Update guild process %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);
                        callback(error, guildProgress);
                    }
                });
            },
            function (guildProgress, callback) {
                var bestKillTimestamps = {all: 0, normal: 0, heroic: 0, mythic: 0};

                async.eachSeries(config.progress.raids, function (raid, callback) {

                    var progress = {normalCount: 0, heroicCount: 0, mythicCount: 0};


                    async.eachSeries(["normal", "heroic", "mythic"], function (difficulty, callback) {
                        progress[difficulty] = {};
                        async.eachSeries(raid.bosses, function (boss, callback) {
                            progress[difficulty][boss] = {timestamps: [], irrelevantTimestamps: []};
                            killModel.aggregateKills(raid.name, difficulty, boss, guildProgress.region, guildProgress.realm, guildProgress.name, function (error, kills) {
                                for (var i = 0; i < kills.length; i++) {

                                    var currentKill = {timestamp: kills[i]._id.timestamp, count: kills[i].count};
                                    if (i + 1 < kills.length) {
                                        var nextKill = {timestamp: kills[i + 1]._id.timestamp, count: kills[i + 1].count};
                                        if (currentKill.timestamp + 1000 == nextKill.timestamp) {
                                            if (difficulty == "mythic") {
                                                if (currentKill.count + nextKill.count >= 16) {
                                                    progress[difficulty][boss]["timestamps"].push([currentKill.timestamp, nextKill.timestamp]);
                                                } else {
                                                    progress[difficulty][boss]["irrelevantTimestamps"].push([currentKill.timestamp, nextKill.timestamp]);
                                                }
                                            } else {
                                                if (currentKill.count + nextKill.count >= 8) {
                                                    progress[difficulty][boss]["timestamps"].push([currentKill.timestamp, nextKill.timestamp]);
                                                } else {
                                                    progress[difficulty][boss]["irrelevantTimestamps"].push([currentKill.timestamp, nextKill.timestamp]);
                                                }
                                            }
                                            //Skip the next
                                            i++;
                                            continue;
                                        }
                                    }

                                    //One timestamp kill
                                    if (difficulty == "mythic") {
                                        if (currentKill.count >= 16) {
                                            progress[difficulty][boss]["timestamps"].push([currentKill.timestamp]);
                                        } else {
                                            progress[difficulty][boss]["irrelevantTimestamps"].push([currentKill.timestamp]);
                                        }
                                    } else {
                                        if (currentKill.count >= 8) {
                                            progress[difficulty][boss]["timestamps"].push([currentKill.timestamp]);
                                        } else {
                                            progress[difficulty][boss]["irrelevantTimestamps"].push([currentKill.timestamp]);
                                        }
                                    }
                                }

                                if (progress[difficulty][boss]["timestamps"].length > 0) {
                                    if (progress[difficulty][boss]["timestamps"][0][0] > bestKillTimestamps[difficulty]) {
                                        bestKillTimestamps[difficulty] = progress[difficulty][boss]["timestamps"][0][0];
                                    }
                                    progress[difficulty + "Count"]++;

                                }


                                callback(error);
                            });
                        }, function (error) {
                            callback(error);
                        });
                    }, function (error) {
                        if (error) {
                            return callback(error);
                        }

                        if (bestKillTimestamps['mythic'] != 0) {
                            bestKillTimestamps['all'] = bestKillTimestamps['mythic'];
                        } else if (bestKillTimestamps['heroic'] != 0) {
                            bestKillTimestamps['all'] = bestKillTimestamps['heroic'];
                        } else if (bestKillTimestamps['normal'] != 0) {
                            bestKillTimestamps['all'] = bestKillTimestamps['normal'];
                        }

                        if(bestKillTimestamps['all'] != 0) {
                            var preScore = 0;
                            if (progress.normalCount && progress.normalCount > 0) {
                                preScore = progress.normalCount;
                            }
                            if (progress.heroicCount && progress.heroicCount > 0) {
                                preScore = progress.heroicCount * 100;
                            }
                            if (progress.mythicCount && progress.mythicCount > 0) {
                                preScore = progress.mythicCount * 10000;
                            }

                            //Calculate the score for redis bestTimestamp - 2Years * score
                            var score = parseInt(bestKillTimestamps['all'] / 1000, 10) - (3600 * 24 * 365 * 2 * preScore);

                            async.parallel([
                                function (callback) {
                                    guildProgressModel.upsertProgress(guildProgress.region, guildProgress.realm, guildProgress.name, raid.tier, raid.name, progress, function (error) {
                                            logger.verbose("Update Progress for guild %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);
                                            callback(error);
                                        }
                                    );
                                },
                                function (callback) {
                                    rankModel.upsert("tier_" + raid.tier + "#" + raid.name, guildProgress.region, guildProgress.realm, guildProgress.name, score, function (error) {
                                        logger.verbose("Update World Rank for guild %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);
                                        callback(error);
                                    });
                                },
                                function (callback) {
                                    rankModel.upsert("tier_" + raid.tier + "#" + raid.name + "#" + guildProgress.region, guildProgress.region, guildProgress.realm, guildProgress.name, score, function (error) {
                                        logger.verbose("Update Region Rank for guild %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);
                                        callback(error);
                                    });
                                },
                                function (callback) {
                                    realmModel.findOne({
                                        region: guildProgress.region,
                                        name: guildProgress.realm
                                    }, {
                                        connected_realms: 1,
                                        "bnet.locale": 1,
                                        "bnet.timezone": 1
                                    }, function (error, realm) {
                                        if (realm && realm.connected_realms && realm.bnet && realm.bnet.locale && realm.bnet.timezone) {
                                            async.parallel([
                                                function (callback) {
                                                    rankModel.upsert("tier_" + raid.tier + "#" + raid.name + "#" + guildProgress.region + realm.connected_realms.join('#'), guildProgress.region, guildProgress.realm, guildProgress.name, score, function (error) {
                                                        logger.verbose("Update Realm Rank for guild %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);
                                                        callback(error);
                                                    });
                                                },
                                                function (callback) {
                                                    var zoneArray = realm.bnet.timezone.split('/');
                                                    if (zoneArray.length > 0) {
                                                        rankModel.upsert("tier_" + raid.tier + "#" + raid.name + "#" + realm.bnet.locale + "#" + zoneArray[0], guildProgress.region, guildProgress.realm, guildProgress.name, score, function (error) {
                                                            logger.verbose("Update Locale Rank for guild %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);
                                                            callback(error);
                                                        });
                                                    } else {
                                                        callback(error)
                                                    }
                                                }
                                            ], function (error) {
                                                callback(error)
                                            });
                                        } else {
                                            logger.warn("Realm %s-%s not found", guildProgress.region, guildProgress.realm);
                                            callback(error);
                                        }
                                    });
                                }
                            ], function (error) {
                                callback(error);
                            });
                        }else {
                            logger.verbose("No progress found for guild %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);
                        }
                    });
                }, function (error) {
                    callback(error);
                });

            }
        ],
        function (error) {
            if (error && error !== true) {
                logger.error(error.message);
            }
            self.updateGuildProgress();
        }
    )

};

/**
 * Start ProgressUpdateProcess
 * @param callback
 */
ProgressUpdateProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting ProgressUpdateProcess");
    this.updateGuildProgress();
    callback();

};

module.exports = ProgressUpdateProcess;