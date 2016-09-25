"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage");

/**
 * Insert a stat object
 * @param tier
 * @param raid
 * @param stat
 * @param callback
 */
module.exports.insertOne = function (tier, raid, type, stats, callback) {
    var collection = applicationStorage.mongo.collection("progress_stats");
    var obj = {tier: tier, raid: raid, type: type, stats: stats}
    collection.insertOne(obj, function (error) {
        callback(error);
    });
};

/**
 * Return the last stat
 * @param raid
 * @param callback
 */
module.exports.getStats = function (tier, raid, type, limit, callback) {
    var collection = applicationStorage.mongo.collection("progress_stats");
    collection.find({tier: tier, raid: raid, type: type}, {stats: 1, _id: 1})
        .sort({_id: -1})
        .limit(limit)
        .toArray(function (error, stats) {
            callback(error, stats);
        });

};