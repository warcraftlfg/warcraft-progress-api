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

    if (sort == undefined && hint == undefined && limit == undefined && callback == undefined) {
        callback = projection;
        collection.find(criteria).toArray(function (error, guilds) {
            callback(error, guilds);
        });
    }else  if (hint == undefined && limit == undefined && callback == undefined) {
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
module.exports.upsert = function (region, realm, name, obj, callback) {

    var guild = {};


    //Sanitize ad object
    if (obj.ad) {
        var confine = new Confine();
        guild.ad = confine.normalize(obj.ad, guildAdSchema);
    }

    if (obj.bnet) {
        guild.bnet = obj.bnet;
    }

    if (obj.perms) {
        guild.perms = obj.perms;
    }

    if (obj.wowProgress) {
        guild.wowProgress = obj.wowProgress;
    }

    if (obj.progress) {
        guild.progress = obj.progress;
    }

    if (obj.rank) {
        guild.rank = obj.rank;
    }

    //Format value
    region = region.toLowerCase();

    guild.region = region;
    guild.realm = realm;
    guild.name = name;
    guild.updated = new Date().getTime();

    //Upsert
    var collection = applicationStorage.mongo.collection("guilds");
    collection.updateOne({
        region: region,
        realm: realm,
        name: name
    }, {$set: guild}, {upsert: true}, function (error) {
        callback(error);
    });

};