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

module.exports.getBossKillCount = function (tier, raid, difficulty, boss, callback) {
    var collection = applicationStorage.mongo.collection("guilds_progress");

    var criteria = {};
    criteria['progress.tier_' + tier + "." + raid + "." + difficulty + "." + boss + ".timestamps.0"] = {$exists: true};
    collection.count(criteria, function (error, count) {
        callback(error, count);
    });
};

module.exports.getGuildProgressDifficultyCount = function (tier, raid, difficulty, callback) {
    var collection = applicationStorage.mongo.collection("guilds_progress");

    var criteria = {};
    criteria['progress.tier_' + tier + "." + raid + "." + difficulty+"Count"] = {$gt: 0};
    collection.count(criteria, function (error, count) {
        callback(error, count);
    });
};

module.exports.getGuildProgressCount = function (tier, raid, callback) {
    var collection = applicationStorage.mongo.collection("guilds_progress");
    var config = applicationStorage.config;


    var or = [];
    config.progress.difficulties.forEach(function(difficulty){
        var tmp ={};
        tmp['progress.tier_' + tier + "." + raid + "." + difficulty+"Count"] = {$gt: 0};
        or.push(tmp);
    });
    var criteria = {"$or":or};

    collection.count(criteria, function (error, count) {
        callback(error, count);
    });
};

