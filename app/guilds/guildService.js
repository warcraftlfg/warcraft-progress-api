"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var updateModel = process.require("updates/updateModel.js");


/**
 * Set the members of a guild to update
 * @param region
 * @param realm
 * @param name
 * @param members
 * @param priority
 * @param callback
 */
module.exports.setMembersToUpdate = function (region, realm, name, members, priority, callback) {
    var logger = applicationStorage.logger;
    var config = applicationStorage.config;
    logger.info("Insert %s character(s) to update",members.length)
    async.each(members, function (member, callback) {
        if (member.character.level >= config.levelMax) {
            updateModel.insert("wp_cu", region, member.character.realm, member.character.name, priority, function (error) {
                logger.verbose("Insert character to update %s-%s-%s with priority", region, member.character.realm, member.character.name, priority <= 5 ? priority : 3);
                callback(error);
            });
        } else {
            callback();
        }
    }, function (error) {
        callback(error);
    });
};
