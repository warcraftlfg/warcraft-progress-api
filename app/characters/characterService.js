"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var updateModel = process.require("updates/updateModel.js");
var killModel = process.require("kills/killModel.js");

/**
 * Upsert character kills in guildKill and insert pveScore
 * @param region
 * @param character
 * @param callback
 */
module.exports.parseProgress = function (region, character, callback) {
    var config = applicationStorage.config;
    var logger = applicationStorage.logger;

    //Loop on talents
    async.forEachSeries(character.talents, function (talent, callback) {
        if (!talent.selected || !talent.spec || talent.spec.name == null || talent.spec.role == null) {
            return callback();
        }
        if (!character.guild || !character.guild.name || !character.guild.realm) {
            return callback();
        }

        //Raid progression with kill
        var update = false;
        async.forEachSeries(character.progression.raids, function (raid, callback) {
            //Parse only raid in config
            var raidConfig = null;
            config.progress.raids.forEach(function (obj) {
                if (obj.name == raid.name) {
                    raidConfig = obj;
                }
            });

            if (raidConfig == null) {
                return callback();
            }

            //Raid progression from character progress bnet
            async.forEachSeries(raid.bosses, function (boss, callback) {

                async.forEachSeries(config.progress.difficulties, function (difficulty, callback) {

                    if (boss[difficulty + 'Timestamp'] == 0 || boss[difficulty + "Timestamp"] + (1000 * 3600 * 24 * 14) < new Date().getTime()) {
                        return callback();
                    }

                    async.series([
                        function (callback) {
                            //Check if the kill already exist
                            killModel.findOne(
                                raid.name,
                                {
                                    region: region,
                                    guildRealm: character.guild.realm,
                                    guildName: character.guild.name,
                                    difficulty: difficulty,
                                    boss: boss.name,
                                    timestamp: boss[difficulty + 'Timestamp'],
                                    characterRealm: character.realm,
                                    characterName: character.name,
                                    source: "progress"
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
                            logger.verbose('Insert Kill %s-%s-%s for %s-%s-%s ', raid.name, difficulty, boss.name, region, character.guild.realm, character.guild.name);

                            var obj = {
                                region: region,
                                guildRealm: character.guild.realm,
                                guildName: character.guild.name,
                                difficulty: difficulty,
                                boss: boss.name,
                                timestamp: boss[difficulty + 'Timestamp'],
                                source: "progress",
                                characterRealm: character.realm,
                                characterName: character.name,
                                characterSpec: talent.spec.name,
                                characterRole: talent.spec.role,
                                characterLevel: character.level,
                                characterClass: character.class,
                                characterAverageItemLevelEquipped: character.items.averageItemLevelEquipped
                            };

                            killModel.insertOne(raid.name, obj, function (error) {
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
                }, function (error) {
                    callback(error);
                });

            }, function (error) {
                callback(error)
            });

        }, function (error) {
            if (error) {
                callback(error)
            } else {
                updateModel.insert("wp_pu", region, character.guild.realm, character.guild.name, 0, function (error) {
                    logger.verbose("Insert Guild %s-%s-%s to update progress queue with priority %s", region, character.guild.realm, character.guild.name, 0);
                    callback(error);
                });
            }
        });
    }, function (error) {
        callback(error);
    });

};
