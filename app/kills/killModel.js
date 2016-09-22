"use strict";

var applicationStorage = process.require("core/applicationStorage.js");

/**
 * Get on kill
 * @param tier
 * @param criteria
 * @param callback
 */
module.exports.findOne = function (raid, criteria, callback) {
    var collection = applicationStorage.mongo.collection(raid);

    collection.findOne(criteria, function (error, kill) {
        callback(error, kill);
    });
};

/**
 * Insert a kill
 * @param tier
 * @param obj
 * @param callback
 */
module.exports.insertOne = function (raid, obj, callback) {
    obj.region = obj.region.toLowerCase();

    var collection = applicationStorage.mongo.collection(raid);
    collection.insertOne(obj, function (error) {
        callback(error);
    });
};

module.exports.aggregateKills = function (raid, difficulty, boss, region, realm, name, callback) {

    var collection = applicationStorage.mongo.collection(raid);


    collection.aggregate([
        {
            $match:{
                region: region,
                guildRealm: realm,
                guildName: name,
                difficulty: difficulty,
                boss: boss
            }
        },
        {
            $group: {
                _id: {
                    timestamp: "$timestamp"
                },
                count: {$sum: 1}
            }
        },
        {
            $sort: {
                timestamp: 1
            }
        },
    ]).toArray(function (error, result) {
        callback(error, result);
    });
};
