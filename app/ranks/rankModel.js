"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage");

/**
 * Insert an update into list
 * @param tier
 * @param region
 * @param realm
 * @param name
 * @param score
 * @param callback
 */
module.exports.upsert = function (tier, region, realm, name, score, callback) {
    var redis = applicationStorage.redis;

    //Create or update auctionUpdate
    redis.zadd("tier_" + tier, score, region + "-" + realm + "-" + name, function (error) {
        callback(error);
    });

};


/**
 * Insert an update into list
 * @param tier
 * @param region
 * @param realm
 * @param name
 * @param callback
 */
module.exports.getRank = function (tier, region, realm, name, callback) {
    var redis = applicationStorage.redis;

    //Create or update auctionUpdate
    redis.zrank("tier_" + tier, region + "-" + realm + "-" + name, function (error, rank) {
        callback(error, rank);
    });

};

/**
 * Insert an update into list
 * @param tier
 * @param start
 * @param callback
 */
module.exports.getRanking = function (key, start, end, callback) {
    var redis = applicationStorage.redis;

    //Create or update auctionUpdate
    redis.zrange("tier_" + key, start, end, function (error, ranking) {
        callback(error, ranking);
    });

};

