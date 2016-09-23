"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var wowprogressAPI = process.require("core/api/wowprogress.js");
var killModel = process.require("kills/killModel.js");
var updateModel = process.require("updates/updateModel.js");
var bnetAPI = process.require("core/api/bnet.js");


//For russian Ream wowprogress use ru locale ...
var russianRealms = {
    "Gordunni": "Гордунни",
    "Howling Fjord": "Ревущий фьорд",
    "Blackscar": "Черный Шрам",
    "Ashenvale": "Ясеневый лес",
    "Soulflayer": "Свежеватель Душ",
    "Razuvious": "Разувий",
    "Azuregos": "Азурегос",
    "Booty Bay": "Пиратская Бухта",
    "Eversong": "Вечная Песня",
    "Deathguard": "Страж смерти",
    "Lich King": "Король-лич",
    "Fordragon": "Дракономор",
    "Borean Tundra": "Борейская тундра",
    "Goldrinn": "Голдринн",
    "Grom": "Гром",
    "Galakrond": "Галакронд"
};

/**
 * CharacterUpdateProcess constructor
 * @constructor
 */
function ProgressImportProcess() {
}

/**
 * Update Old Progress
 */
ProgressImportProcess.prototype.import = function () {

    var logger = applicationStorage.logger;
    var self = this;

    var maxPage = 2471;
    var count = -1;
    async.whilst(
        function () {
            return count <= maxPage;
        },
        function (callback) {


            async.waterfall([
                function (callback) {
                    /*wowprogressAPI.getGuildsUrlsOnPage(count, function (error, guildUrls) {
                     callback(error, guildUrls);
                     });*/
                    wowprogressAPI.getGuildsOnPage(count, function (error, guilds) {
                        callback(error, guilds);
                    });
                },
                function (guilds, callback) {
                    async.eachSeries(guilds, function (guild, callback) {
                        bnetAPI.getGuild(guild.region, decodeURI(guild.realm), decodeURI(guild.name.replace(/\+/g, ' ')), [], function (error, bnetGuild) {
                            if (!bnetGuild || !bnetGuild.realm || !bnetGuild.name) {
                                logger.warn("Bnet return empty guild %s-%s-%s, skip it", guild.region, guild.realm, guild.name);
                                callback();

                            } else {
                                updateModel.insert("wp_pu", guild.region, bnetGuild.realm, bnetGuild.name, 10, function (error) {
                                    logger.verbose("Set Progress to update for guild %s-%s-%s ", guild.region, bnetGuild.realm, bnetGuild.name);
                                    callback(error);
                                });
                            }
                        });
                    }, function (error) {
                        callback(error);
                    });
                }
                /*function (guildUrls, callback) {
                 async.each(guildUrls, function (guildUrl, callback) {
                 async.waterfall([

                 function (callback) {
                 //Get Kills
                 wowprogressAPI.getKills(guildUrl, function (error, kills) {
                 callback(error, kills);
                 });
                 },
                 function (kills, callback) {
                 //Push Kills
                 async.forEachSeries(kills, function (kill, callback) {

                 killModel.upsert(kill.region, kill.realm, kill.name, 18, kill.boss, kill.difficulty, kill.timestamp, "wowprogress", null, function (error) {
                 if (!error) {
                 logger.verbose("Upsert a new kill for guild %s-%s-%s on %s-%s at %s", kill.region, kill.realm, kill.name, kill.boss, kill.difficulty, kill.timestamp);
                 }
                 callback(error);
                 })
                 }, function (error) {
                 callback(error, kills);
                 });
                 },
                 function (kills, callback) {
                 if (kills.length > 0) {
                 updateModel.insert("wp_pu", kills[0].region, kills[0].realm, kills[0].name, 10, function (error) {
                 logger.verbose("Set Progress to update for guild %s-%s-%s ", kills[0].region, kills[0].realm, kills[0].name);

                 callback(error);
                 });
                 } else {
                 callback();
                 }
                 }
                 ], function (error) {
                 if (error && error !== true) {
                 logger.error(error.message);
                 }
                 callback();
                 });
                 }, function () {
                 callback();
                 });
                 }*/
            ], function (error) {
                if (error) {
                    if (error && error !== true) {
                        logger.error(error.message);
                    }
                }
                count++;
                callback(null, count);
            });

        },
        function () {

            process.exit();
        }
    );
};

/**
 * Start ProgressImportProcess
 * @param callback
 */
ProgressImportProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting ProgressImportProcess");
    this.import();
    callback();
};

module.exports = ProgressImportProcess;