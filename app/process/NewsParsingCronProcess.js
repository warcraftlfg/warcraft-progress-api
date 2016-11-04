"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var killModel = process.require("kills/killModel.js");
var bnetAPI = process.require("core/api/bnet.js");


/**
 * StatsCronProcess constructor
 * @constructor
 */
function StatsCronProcess() {
}

StatsCronProcess.prototype.runCron = function () {
    var logger = applicationStorage.logger;
    var config = applicationStorage.config;

    async.forEach(config.fastUpdate.guilds, function (guild, callback) {

        logger.info("Parsing guild %s-%s-%s", guild.region, guild.realm, guild.name);
        async.waterfall([
            function (callback) {
                bnetAPI.getGuild(guild.region, guild.realm, guild.name, ['news'], function (error, newsFeed) {
                    callback(error, newsFeed)
                });
            },
            function (newsFeed, callback) {
                async.forEach(newsFeed.news, function (news, callback) {
                    if (news.type == "playerAchievement") {

                        async.forEach(config.fastUpdate.achievements, function (achievement, callback) {

                            if (news.achievement.id == achievement.id) {
                                logger.info("playerAchievement %s found for player %s-%s-%s from guild %s timestamp %s", news.achievement.id, guild.region, guild.realm, news.character, guild.name,news.timestamp);

                                async.series([
                                    function (callback) {
                                        //Check if the kill already exist
                                        killModel.findOne(
                                            achievement.raid,
                                            {
                                                region: guild.region,
                                                guildRealm: guild.realm,
                                                guildName: guild.name,
                                                difficulty: achievement.difficulty,
                                                boss: achievement.boss,
                                                timestamp: news.timestamp,
                                                characterRealm: guild.realm,
                                                characterName: news.character,
                                                source: "news"
                                            },
                                            function (error, kill) {
                                                if (kill) {
                                                    //Kill already exist skip the insert
                                                    callback(true);
                                                } else {
                                                    //Go to next step to insert the kill
                                                    callback(error);
                                                }
                                            });
                                    },
                                    function (callback) {
                                        logger.verbose('Insert Kill %s-%s-%s for %s-%s-%s ', achievement.raid, achievement.difficulty, achievement.boss, guild.region, guild.realm, guild.name);

                                        var obj = {
                                            region: guild.region,
                                            guildRealm: guild.realm,
                                            guildName: guild.name,
                                            difficulty: achievement.difficulty,
                                            boss: achievement.boss,
                                            timestamp: news.timestamp,
                                            source: "news",
                                            characterRealm: guild.realm,
                                            characterName: news.character
                                        };

                                        killModel.insertOne(achievement.raid, obj, function (error) {
                                            callback(error);
                                        });
                                    }
                                ], function (error) {
                                    if (error == true) {
                                        callback();
                                    } else {
                                        callback(error);
                                    }
                                });
                            } else {
                                callback();
                            }
                        }, function (error) {
                            callback(error);
                        });

                    } else {
                        callback();
                    }
                }, function (error) {
                    callback(error);
                });
            }
        ], function (error) {
            if (error) {
                logger.error(error.message);
            }
            callback()
        });
    }, function () {
        process.exit();
    })
};


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