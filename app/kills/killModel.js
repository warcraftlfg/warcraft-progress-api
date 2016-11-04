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
            $match: {
                region: region,
                guildRealm: realm,
                guildName: name,
                difficulty: difficulty,
                boss: boss,
            }
        },
        {
            $group: {
                _id: {
                    timestamp:"$timestamp",
                    source:"$source"
                },
                count: {$sum: 1}
            }
        },
        {
            $sort: {
                "_id.source":1,
                "_id.timestamp": 1
            }
        },
    ]).toArray(function (error, result) {
        callback(error, result);
    });
};

module.exports.getRoster = function (raid, region, realm, name, difficulty, boss, timestamps, callback) {
    var collection = applicationStorage.mongo.collection(raid);

    var criteria = {region: region, guildRealm: realm, guildName: name, difficulty: difficulty, boss: boss};

    if (timestamps.length == 1) {
        criteria["timestamp"] = parseInt(timestamps, 10);
    } else {
        criteria["$or"] = [];
        timestamps.forEach(function (timestamp) {
            criteria["$or"].push({timestamp: parseInt(timestamp, 10)})
        });
    }

    var projection = {
        characterRealm: 1,
        characterName: 1,
        characterSpec: 1,
        characterRole: 1,
        characterLevel: 1,
        characterClass: 1,
        characterAverageItemLevelEquipped: 1,
        _id: 0
    };

    collection.find(criteria, projection).sort({characterName: 1}).toArray(function (error, players) {
        callback(error, players);
    })
};

module.exports.getStatsByClass = function (raid, callback) {
    var collection = applicationStorage.mongo.collection(raid);

    collection.aggregate([
        {

            $group: {
                _id: {
                    difficulty: "$difficulty",
                    boss: "$boss",
                    characterClass: "$characterClass",
                },
                count: {$sum: 1}
            }
        },

    ]).toArray(function (error, result) {
        callback(error, result);
    });

};
