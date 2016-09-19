"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");

/**
 * Get the guilds Progress
 * @param criteria
 * @param projection
 * @param sort
 * @param limit
 * @param hint
 * @param callback
 */
module.exports.find = function (criteria, projection, sort, limit, hint, callback) {
    var collection = applicationStorage.mongo.collection("guilds_progress");

    if (sort == undefined && hint == undefined && limit == undefined && callback == undefined) {
        callback = projection;
        collection.find(criteria).toArray(function (error, guilds) {
            callback(error, guilds);
        });
    } else if (hint == undefined && limit == undefined && callback == undefined) {
        callback = sort;
        collection.find(criteria, projection).toArray(function (error, guilds) {
            callback(error, guilds);
        });
    } else if (hint == undefined && callback == undefined) {
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

/**
 * Update or insert objects for the guild
 * @param region
 * @param realm
 * @param name
 * @param obj
 * @param callback
 */
module.exports.upsertProgress = function (region, realm, name, tier, raid, progress, callback) {

    var guild = {};

    //Format value
    region = region.toLowerCase();

    guild.region = region;
    guild.realm = realm;
    guild.name = name;
    guild.updated = new Date().getTime();
    guild['progress.tier_' + tier + '.' + raid] = progress;

    //Upsert
    var collection = applicationStorage.mongo.collection("guilds_progress");
    collection.updateOne({
        region: region,
        realm: realm,
        name: name
    }, {$set: guild}, {upsert: true}, function (error) {
        callback(error);
    });

};

module.exports.aggregate = function (criteria, project, callback) {
    var collection = applicationStorage.mongo.collection("guilds_progress");
    collection.aggregate([
        {
            $match: criteria
        },
        {
            $project: project
        }
    ], function (error, results) {
        callback(error, results);
    });
};
