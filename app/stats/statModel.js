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
module.exports.insertOne = function (tier, raid, stats, callback) {
    var collection = applicationStorage.mongo.collection("progress_stats");
    var obj = {tier: tier, raid: raid, stats: stats}
    collection.insertOne(obj, function (error) {
        callback(error);
    });
};

/**
 * Return the last stat (max 200)
 * @param raid
 * @param callback
 */
module.exports.getStats = function (tier, raid, limit, callback) {
    var collection = applicationStorage.mongo.collection("progress_stats");
    collection.find({tier: tier, raid: raid}, {stats:1})
        .sort({_id: 1})
        .limit(limit)
        .toArray(function (error, stats) {
            console.log(stats);
            callback(error, stats);
        });

};