"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var updateModel = process.require("updates/updateModel.js");
var updateService = process.require("updates/updateService.js");
var guildService = process.require("guilds/guildService.js");
var guildModel = process.require("guilds/guildModel.js");
var bnetAPI = process.require("core/api/bnet.js");

/**
 * GuildUpdateProcess constructor
 * @constructor
 */
function GuildUpdateProcess() {
}

/**
 * Update a guild
 */
GuildUpdateProcess.prototype.updateGuild = function () {
    var self = this;
    var logger = applicationStorage.logger;


    async.waterfall([
        function (callback) {
            //Get next guild to update
            updateService.getNextUpdate('wp_gu', function (error, guildUpdate) {
                if (guildUpdate == null) {
                    //Guild update is empty
                    logger.info("No guild to update ... waiting 3 sec");
                    setTimeout(function () {
                        callback(true);
                    }, 3000);
                } else {
                    logger.info("Update guild %s-%s-%s", guildUpdate.region, guildUpdate.realm, guildUpdate.name);
                    callback(error, guildUpdate);
                }
            });
        },
        function (guildUpdate, callback) {
            //Sanitize name
            bnetAPI.getGuild(guildUpdate.region, guildUpdate.realm, guildUpdate.name, ["members"], function (error, guild) {
                if (error) {
                    if (error.statusCode == 403) {
                        logger.info("Bnet Api Deny ... waiting 1 min");
                        updateModel.insert("wp_gu", guildUpdate.region, guildUpdate.realm, guildUpdate.name, guildUpdate.priority, function () {
                            setTimeout(function () {
                                callback(true);
                            }, 60000);
                        });
                    } else {
                        callback(error);
                    }
                } else {
                    if (guild && guild.realm && guild.name) {
                        callback(error, guildUpdate.region, guild, guildUpdate.priority);
                    } else {
                        logger.warn("Bnet return empty guild skip it");
                        callback(true);
                    }
                }

            })
        },
        function (region, guild, priority, callback) {
            guildService.setMembersToUpdate(region, guild.realm, guild.name, guild.members, priority, function (error) {
                callback(error);
            });
        }
    ], function (error) {
        if (error && error !== true) {
            logger.error(error.message);
        }
        self.updateGuild();
    });
};

/**
 * Start GuildUpdateProcess
 * @param callback
 */
GuildUpdateProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting GuildUpdateProcess");
    this.updateGuild();
    callback();
};

module.exports = GuildUpdateProcess;