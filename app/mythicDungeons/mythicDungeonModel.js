"use strict";

var applicationStorage = process.require("core/applicationStorage.js");

/**
 * Get a run
 * @param extension
 * @param criteria
 * @param callback
 */
module.exports.findOne = function (extension, criteria, callback) {
    var collection = applicationStorage.mongo.collection(extension + "_dungeons");
    collection.findOne(criteria, function (error, run) {
        callback(error, run);
    });
};

/**
 * Get a run
 * @param extension
 * @param criteria
 * @param callback
 */
module.exports.find = function (extension, criteria, limit,callback) {
    var collection = applicationStorage.mongo.collection(extension + "_dungeons");
    collection.find(criteria,{_id:0}).sort({level: -1, time: 1}).limit(limit).toArray(function (error, runs) {
        callback(error, runs);
    });
};

/**
 * Insert a run
 * @param extension
 * @param run
 * @param callback
 */
module.exports.insertOne = function (extension, run, callback) {
    run.region = run.region.toLowerCase();

    var collection = applicationStorage.mongo.collection(extension + "_dungeons");
    collection.insertOne(run, function (error) {
        callback(error);
    });
};