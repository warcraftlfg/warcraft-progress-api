"use strict";

var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");


/**
 * Get the kills
 * @param tier
 * @param criteria
 * @param callback
 */
module.exports.find = function (tier, criteria, callback) {
    var collection = applicationStorage.mongo.collection("tier_" + tier);

    collection.find(criteria).toArray(function (error, kills) {
        callback(error, kills);
    });
};

/**
 * Upsert a kill
 * @param region
 * @param realm
 * @param name
 * @param tier
 * @param boss
 * @param difficulty
 * @param timestamp
 * @param source
 * @param raider
 * @param callback
 */
module.exports.upsert = function (region, realm, name, tier, boss, difficulty, timestamp, source, raider, callback) {

    region = region.toLowerCase();
    //Upsert
    var guildKill = {
        region: region,
        realm: realm,
        name: name,
        boss: boss,
        difficulty: difficulty,
        timestamp: timestamp,
        source: source,
        updated: new Date().getTime()
    };

    var collection = applicationStorage.mongo.collection("tier_" + tier);
    async.series([
        function (callback) {
            collection.updateOne({
                    region: region,
                    realm: realm,
                    name: name,
                    boss: boss,
                    difficulty: difficulty,
                    timestamp: timestamp,
                    source: source
                }, {$set: guildKill},
                {upsert: true}, function (error) {
                    callback(error);
                });
        },
        function (callback) {
            if (raider) {
                collection.updateOne({
                    region: region,
                    realm: realm,
                    name: name,
                    boss: boss,
                    difficulty: difficulty,
                    timestamp: timestamp,
                    source: source,
                    "roster.name": {$ne: raider.name}
                }, {$push: {roster: raider}}, function (error) {
                    callback(error);
                });
            }
            else {
                callback();
            }
        }
    ], function (error) {
        callback(error);
    })
};


/**
 * Map reduce for
 * @param region
 * @param realm
 * @param name
 * @param raid
 * @param callback
 */
module.exports.computeProgress = function (region, realm, name, tier, callback) {

    async.waterfall([
        function (callback) {
            //Format value
            region = region.toLowerCase();
            callback();
        },
        function (callback) {
            //Upsert
            var map = function () {
                var mapped = {
                    timestamp: this.timestamp,
                    roster: this.roster,
                    source: this.source
                };
                var key = {difficulty: this.difficulty, boss: this.boss};
                emit(key, mapped);
            };

            var reduce = function (key, values) {
                var reduced = {timestamps: [], irrelevantTimestamps: []};

                if (values && values[0] && values[0].timestamps) {
                    reduced = values[0];
                }

                for (var idx = 0; idx < values.length; idx++) {
                    if (values[idx].source === "wowprogress") {
                        if (idx < values.length - 1 && values[idx].timestamp + 1000 >= values[idx + 1].timestamp) {
                            if (values[idx + 1].source != "progress") {
                                //no progress found in + or - 1 sec of wowprogress entry
                                reduced.timestamps.push([values[idx].timestamp]);
                            } else if (values[idx].timestamp < 1464739200000) {
                                //Before 2016/06/01 wowprogress is mandatory
                                reduced.timestamps.push([values[idx].timestamp]);
                                idx++;
                            }
                        } else {
                            reduced.timestamps.push([values[idx].timestamp]);
                        }
                    }
                    else if (values[idx].source === "progress") {
                        if (idx < values.length - 1 && values[idx].roster && values[idx].timestamp + 1000 >= values[idx + 1].timestamp && values[idx + 1].source == "progress" && values[idx + 1].roster) {
                            var rosterLength = values[idx].roster.length + values[idx + 1].roster.length;
                            if ((key.difficulty == "mythic" && rosterLength >= 11) || ((key.difficulty == "normal" || key.difficulty == "heroic") && rosterLength >= 7)) {
                                reduced.timestamps.push([values[idx].timestamp, values[idx + 1].timestamp]);
                            } else {
                                reduced.irrelevantTimestamps.push([values[idx].timestamp, values[idx + 1].timestamp]);
                            }
                            idx++;
                        } else {
                            if (values[idx].roster && ((key.difficulty == "mythic" && values[idx].roster.length >= 11) || ((key.difficulty == "normal" || key.difficulty == "heroic") && values[idx].roster.length >= 7 ))) {
                                reduced.timestamps.push([values[idx].timestamp]);
                            } else {
                                reduced.irrelevantTimestamps.push([values[idx].timestamp]);
                            }
                        }
                    }
                }
                return reduced;
            };

            var finalize = function (key, value) {
                if (value.timestamp) {

                    if ((value.source == "progress" && ((key.difficulty == "mythic" && value.roster.length >= 11 ) || ((key.difficulty == "normal" || key.difficulty == "heroic") && value.roster.length >= 7))) || value.source == "wowprogress") {
                        return {timestamps: [[value.timestamp]], irrelevantTimestamps: []};
                    } else if (value.source == "wowprogress" && value.timestamp < 1464739200000) {
                        return {timestamps: [[value.timestamp]], irrelevantTimestamps: []};
                    } else {
                        return {timestamps: [], irrelevantTimestamps: [[value.timestamp]]};
                    }
                }
                return value;
            };

            var collection = applicationStorage.mongo.collection("tier_" + tier);
            collection.mapReduce(map, reduce, {
                out: {inline: 1},
                finalize: finalize,
                query: {region: region, realm: realm, name: name},
                sort: {timestamp: 1, source: -1}
            }, function (error, result) {
                callback(error, result);
            });
        }
    ], function (error, result) {
        callback(error, result);
    });
};
