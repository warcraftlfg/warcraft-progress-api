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
 * Update Guild progress
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
                async.eachSeries(config.progress.raids, function (raid, callback) {
                    async.waterfall([
                            function (callback) {
                                killModel.computeProgress(guildProgress.region, guildProgress.realm, guildProgress.name, raid.tier, function (error, result) {
                                    callback(error, result);
                                });
                            },
                            function (result, callback) {
                                var progress = {normalCount: 0, heroicCount: 0, mythicCount: 0};
                                var bestNormalKillTimestamp = 0;
                                var bestHeroicKillTimestamp = 0;
                                var bestMythicKillTimestamp = 0;

                                async.forEachSeries(result, function (obj, callback) {


                                    logger.verbose("Kills found for %s-%s R:(%s) I:(%s)", obj._id.boss, obj._id.difficulty, obj.value.timestamps.join(','), obj.value.irrelevantTimestamps.join(','))

                                    if (!progress[obj._id.difficulty]) {
                                        progress[obj._id.difficulty] = {};
                                    }
                                    progress[obj._id.difficulty][obj._id.boss] = obj.value;

                                    if (!progress[obj._id.difficulty + "Count"]) {
                                        progress[obj._id.difficulty + "Count"] = 0;
                                    }

                                    if (obj.value.timestamps.length > 0) {
                                        progress[obj._id.difficulty + "Count"]++;
                                        if (obj._id.difficulty == "normal") {
                                            if (obj.value.timestamps[0][0] > bestNormalKillTimestamp) {
                                                bestNormalKillTimestamp = obj.value.timestamps[0][0];
                                            }
                                        } else if (obj._id.difficulty == "heroic") {
                                            if (obj.value.timestamps[0][0] > bestHeroicKillTimestamp) {
                                                bestHeroicKillTimestamp = obj.value.timestamps[0][0];
                                            }
                                        } else {
                                            if (obj.value.timestamps[0][0] > bestMythicKillTimestamp) {
                                                bestMythicKillTimestamp = obj.value.timestamps[0][0];
                                            }
                                        }
                                    }


                                    callback();
                                }, function () {
                                    var obj = {};
                                    if (bestMythicKillTimestamp != 0) {
                                        progress.bestKillTimestamp = bestMythicKillTimestamp;
                                    } else if (bestHeroicKillTimestamp != 0) {
                                        progress.bestKillTimestamp = bestHeroicKillTimestamp;
                                    } else if (bestNormalKillTimestamp != 0) {
                                        progress.bestKillTimestamp = bestNormalKillTimestamp;
                                    }

                                    progress.updated = new Date().getTime();
                                    obj["tier_" + raid.tier] = progress;

                                    guildProgressModel.upsert(guildProgress.region, guildProgress.realm, guildProgress.name, {progress: obj}, function (error) {
                                        logger.verbose("Update Progress for guild %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);
                                        callback(error, progress);
                                    });

                                });
                            }, function (progress, callback) {
                                if (progress.bestKillTimestamp) {
                                    logger.verbose("Update Score for guild %s-%s-%s", guildProgress.region, guildProgress.realm, guildProgress.name);

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
                                    var score = parseInt(progress.bestKillTimestamp / 1000, 10) - (3600 * 24 * 365 * 2 * preScore);

                                    async.parallel([
                                        function (callback) {
                                            rankModel.upsert(raid.tier, guildProgress.region, guildProgress.realm, guildProgress.name, score, function (error) {
                                                callback(error);
                                            });
                                        },
                                        function (callback) {
                                            rankModel.upsert(raid.tier + "_" + guildProgress.region, guildProgress.region, guildProgress.realm, guildProgress.name, score, function (error) {
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
                                                            rankModel.upsert(raid.tier + "_" + guildProgress.region + "_" + realm.connected_realms.join('_'), guildProgress.region, guildProgress.realm, guildProgress.name, score, function (error) {
                                                                callback(error);
                                                            });
                                                        },
                                                        function (callback) {
                                                            var zoneArray = realm.bnet.timezone.split('/');
                                                            if (zoneArray.length > 0) {
                                                                rankModel.upsert(raid.tier + "_" + realm.bnet.locale + "_" + zoneArray[0], guildProgress.region, guildProgress.realm, guildProgress.name, score, function (error) {
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

                                } else {
                                    callback();
                                }
                            }
                        ],
                        function (error) {
                            callback(error);
                        }
                    )
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
    ;
}
;

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