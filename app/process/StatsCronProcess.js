"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var guildProgressModel = process.require("guildProgress/guildProgressModel.js");
var statModel = process.require("stats/statModel.js");


/**
 * StatsCronProcess constructor
 * @constructor
 */
function StatsCronProcess() {
}

StatsCronProcess.prototype.runCron = function () {
    var logger = applicationStorage.logger;
    var config = applicationStorage.config;

    async.forEach(config.progress.raids, function (raid, callback) {

            async.waterfall([
                    function (callback) {
                        var stats = {};
                        async.parallel([
                            function (callback) {
                                async.eachSeries(config.progress.difficulties, function (difficulty, callback) {
                                    stats[difficulty] = {};
                                    async.parallel([
                                        function (callback) {
                                            async.eachSeries(raid.bosses, function (boss, callback) {
                                                guildProgressModel.getBossKillCount(raid.tier, raid.name, difficulty, boss, function (error, count) {
                                                    stats[difficulty][boss] = count;
                                                    callback(error);
                                                });
                                            }, function (error) {
                                                callback(error);
                                            });
                                        },
                                        function (callback) {
                                            guildProgressModel.getGuildProgressDifficultyCount(raid.tier, raid.name, difficulty, function (error, count) {
                                                stats[difficulty + "Count"] = count;
                                                callback(error);
                                            });
                                        }
                                    ], function (error) {
                                        callback(error);
                                    })

                                }, function (error) {
                                    callback(error);
                                });
                            },
                            function (callback) {
                                guildProgressModel.getGuildProgressCount(raid.tier, raid.name, function (error, count) {
                                    stats["count"] = count;
                                    callback(error);
                                });
                            }
                        ], function (error) {
                            callback(error, stats);
                        });

                    },

                    function (stats, callback) {
                        statModel.insertOne(raid.tier, raid.name, stats, function (error) {
                            callback(error);
                        });
                    }
                ],
                function (error) {
                    callback(error);
                }
            )
            ;
        }, function (error) {
            if (error) {
                logger.error(error.message);
            }
            process.exit();
        }
    )
    ;


}
;

/**
 * Start StatsCronProcess
 * @param callback
 */
StatsCronProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting StatsCronProcess");
    this.runCron();
    callback();
};

module.exports = StatsCronProcess;