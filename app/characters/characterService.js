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
module.exports.parseProgress = function(region,character,callback){
    var config = applicationStorage.config;
    var logger = applicationStorage.logger;

    //Loop on talents
    async.forEachSeries(character.talents,function(talent,callback) {
        if(!talent.selected || !talent.spec || talent.spec.name == null || talent.spec.role == null) {
            return callback();
        }


        //Raid progression with kill
        async.forEachSeries(character.progression.raids,function(raid,callback) {
            //Parse only raid in config
            var raidConfig = null;
            config.progress.raids.forEach(function(obj){
                if (obj.name == raid.name) {
                    raidConfig = obj;
                }
            });

            if (raidConfig == null) {
                return callback();
            }

            //Raid progression from character progress bnet
            async.forEachSeries(raid.bosses,function(boss,callback){

                var difficulties = ["normal","heroic","mythic"];

                if (character.guild && character.guild.name && character.guild.realm) {
                    async.forEachSeries(difficulties, function(difficulty, callback) {

                        if(boss[difficulty+'Timestamp'] == 0) {
                            return callback();
                        }

                        async.series([
                            function(callback){

                                var raider = {name:character.name, realm:character.realm, region:region,spec:talent.spec.name,role:talent.spec.role,level:character.level,faction:character.faction,class:character.class,averageItemLevelEquipped:character.items.averageItemLevelEquipped};
                                guildKillModel.upsert(region,character.guild.realm,character.guild.name,raid.name,boss.name,difficulty,boss[difficulty+'Timestamp'],"progress",raider,function(error) {
                                    logger.verbose('Insert Kill %s-%s-%s for %s-%s-%s ',raid.name,difficulty,boss.name,region,character.guild.realm,character.guild.name);
                                    callback(error);
                                });
                            },
                            function(callback){
                                updateModel.insert("wp_gpu",region, character.guild.realm, character.guild.name, 0, function (error) {
                                    callback(error);
                                });
                            }
                        ],function(error){
                            callback(error);
                        });

                    },function(error){
                        callback(error);
                    });
                } else {
                    callback();
                }
            },function(error){
                callback(error)
            });

        },function(error){
            callback(error);
        });
    },function(error){
        callback(error);
    });

};
