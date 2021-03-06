"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");

/**
 * Get the guilds
 * @param criteria
 * @param projection
 * @param callback
 */
module.exports.getGuildInfo = function (region, realm, name, callback) {
    var collection = applicationStorage.mongo.collection("guilds");
    collection.findOne({region: region, realm: realm, name: name}, {'bnet.side': 1,'ad.lfg':1,"parser.active":1}, function (error, guild) {
        callback(error, guild);
    });

};
