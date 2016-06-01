"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var updateModel = process.require("updates/updateModel.js");
var guildKillModel = process.require("guildKills/guildKillModel.js");

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
                var difficulties = ["normal", "heroic", "mythic"];
                async.forEachSeries(difficulties, function (difficulty, callback) {

                    if (boss[difficulty + 'Timestamp'] == 0 || boss[difficulty+"Timestamp"]+(1000*3600*24*14) < new Date().getTime() ) {
                        return callback();
                    }

                    var raider = {
                        name: character.name,
                        realm: character.realm,
                        region: region,
                        spec: talent.spec.name,
                        role: talent.spec.role,
                        level: character.level,
                        faction: character.faction,
                        class: character.class,
                        averageItemLevelEquipped: character.items.averageItemLevelEquipped
                    };
                    guildKillModel.upsert(region, character.guild.realm, character.guild.name, raidConfig.tier, boss.name, difficulty, boss[difficulty + 'Timestamp'], "progress", raider, function (error) {
                        logger.verbose('Insert Kill %s-%s-%s for %s-%s-%s ', raid.name, difficulty, boss.name, region, character.guild.realm, character.guild.name);
                        update = true;
                        callback(error);
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
                updateModel.insert("wp_gpu", region, character.guild.realm, character.guild.name, 0, function (error) {
                    logger.verbose("Insert GuildProgress to update %s-%s-%s with priority %s", region, character.guild.realm, character.guild.name, 0);
                    callback(error);
                });
            }
        });
    }, function (error) {
        callback(error);
    });

};
