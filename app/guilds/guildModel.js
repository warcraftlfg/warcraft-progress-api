"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");

/**
 * Get the guilds
 * @param criteria
 * @param projection
 * @param sort
 * @param limit
 * @param hint
 * @param callback
 */
module.exports.find = function (criteria, projection, sort, limit, hint, callback) {
    var collection = applicationStorage.mongo.collection("guilds");
    if (hint === undefined && limit === undefined && callback == undefined) {
        callback = sort;
        collection.find(criteria, projection).toArray(function (error, guilds) {
            callback(error, guilds);
        });
    } else if (hint === undefined && callback == undefined) {
        callback = limit;
        collection.find(criteria, projection).sort(sort).toArray(function (error, guilds) {
            callback(error, guilds);
        });
    } else if (callback == undefined) {
        callback = hint;
        collection.find(criteria, projection).sort(sort).limit(limit).toArray(function (error, guilds) {
            callback(error, guilds);
        });
    } else {
        collection.find(criteria, projection).sort(sort).limit(limit).hint(hint).toArray(function (error, guilds) {
            callback(error, guilds);
        });
    }
};