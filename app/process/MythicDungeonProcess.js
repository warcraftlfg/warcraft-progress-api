"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var dungeons = process.require("config/mythicDungeons.json");

var mythicDungeonService = process.require("mythicDungeons/mythicDungeonService.js");


var realmModel = process.require("realms/realmModel.js");
/**
 * MythicDungeonProcess constructor
 * @constructor
 */
function MythicDungeonProcess() {
}

/**
 * ParseWowWebsite
 */
MythicDungeonProcess.prototype.parseSite = function () {
    var self = this;
    var logger = applicationStorage.logger;


    async.waterfall([
            function (callback) {
                //GET ALL REALMS (except CN & TW)
                realmModel.find({$or: [{region: "eu"}, {region: "us"}]}, {
                    "bnet.slug": 1,
                    name:1,
                    connected_realms: 1,
                    region: 1,
                    _id: 0
                }, function (error, realms) {
                    callback(error, realms);
                });
            },
            function (realms, callback) {
                var realmsSlugArray = [];
                realms.forEach(function (realm) {
                    realmsSlugArray[realm.bnet.slug] = realm.name;
                });
                callback(null,realms,realmsSlugArray);
            },
            function (realms, realmsSlugArray, callback) {
                async.forEachSeries(realms, function (realm, callback) {
                    async.forEachSeries(dungeons, function (dungeon, callback) {
                        mythicDungeonService.getRuns(realm, dungeon, realmsSlugArray, function (error) {
                            if (error) {
                                logger.error(error.message);
                            }
                            callback();
                        });
                    }, function () {
                        callback();
                    });
                }, function () {
                    callback();
                });
            }
        ],
        function (error) {
            if (error && error !== true) {
                logger.error(error.message);
            }
            console.log("FINI");
            //self.parseSite();
        }
    );
};

/**
 * Start MythicDungeonProcess
 * @param callback
 */
MythicDungeonProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting MythicDungeonProcess");
    this.parseSite();
    callback();
};

module.exports = MythicDungeonProcess;