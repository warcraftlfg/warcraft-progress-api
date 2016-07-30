"use strict";

//Load dependencies
var request = require("request");
var _ = require('lodash');
var cheerio = require("cheerio");
var async = require("async");
var bnetAPI = process.require("core/api/bnet.js");
var updateModel = process.require("updates/updateModel.js");

//Configuration
var applicationStorage = process.require("core/applicationStorage.js");


module.exports.getWoWProgressPage = function (path, callback) {
    var url = "http://www.wowprogress.com" + path;
    var logger = applicationStorage.logger;
    logger.verbose("GET wowprogress URL %s", url);
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, body);
        } else {
            callback(new Error("Error HTTP " + error.message + " on fetching wowprogress api " + url));
        }
    });
};

module.exports.getGuildsUrlsOnPage = function (number, callback) {
    var self = this;
    async.waterfall([
        function (callback) {
            if (number == -1) {
                var url = "/pve/rating/next";
            } else {
                var url = "/pve/rating/next/" + number + "/rating";
            }
            self.getWoWProgressPage(url, function (error, body) {
                callback(error, body)
            })
        },
        function (body, callback) {
            var $ = cheerio.load(body);


            var urls = [];
            $('body').find('.ratingContainer table.rating tr a.guild').each(function (i, elem) {
                urls.push($(this).attr('href'));
            });

            callback(null, urls);
        }
    ], function (error, urls) {
        callback(error, urls);
    })

};

module.exports.getKills = function (url, callback) {
    var self = this;
    var logger = applicationStorage.logger;


    async.waterfall([
            function (callback) {
                self.getWoWProgressPage(url, function (error, body) {
                    callback(error, body)
                })
            },
            function (body, callback) {

                var $ = cheerio.load(body);


                var armoryUrl = decodeURIComponent(($('.armoryLink').attr('href')));

                if (armoryUrl == "undefined") {
                    return callback(new Error('Armory link undefined'));
                }
                try {
                    var name = $('h1').text().match("“(.*)” WoW Guild")[1];
                    var realm = armoryUrl.match('battle.net/wow/guild/(.*)/(.*)/')[1];
                    var region = armoryUrl.match('http://(.*).battle.net/wow/guild/')[1];
                } catch (e) {
                    logger.info("Parsing error, trying CN");
                    try {
                        var name = $('h1').text().match("“(.*)” WoW Guild")[1];
                        var realm = $('.realm').text().substring(3);
                        //var realm = armoryUrl.match('www.battlenet.com.cn/wow/guild/(.*)/(.*)/')[1];
                        var region = armoryUrl.match('http://www.battlenet.com.(.*)/wow/guild/')[1];
                    } catch (e) {
                        logger.error("Error on page parsing %s", url);
                        callback(true);
                    }
                }

                bnetAPI.getGuild(region, realm, name, [], function (error, guild) {
                    if (!guild || !guild.realm || !guild.name) {
                        logger.warn("Bnet return empty guild so try to update %s-%s-%s, skip it", region, realm, name);

                        //Bug on chinese ...
                        if (region == "cn") {
                            updateModel.insert("wp_pu", region, realm, name, 3, function () {
                                logger.verbose("Insert GuildProgress to update %s-%s-%s with priority %s", region, realm, name, 3);
                                callback(true);
                            });
                        } else {
                            callback(true);
                        }
                    } else {
                        callback(error, $, region, guild.realm, guild.name);
                    }
                });


            }
            ,
            function ($, region, realm, name, callback) {
                var kills = [];

                var bestTimestamp = 999999999999999999999;
                var normalCount = 0;
                var heroicCount = 0;
                var mythicCount = 0;
                var normalArchimonde = false;
                var heroicArchimonde = false;
                var mythicArchimonde = false;
                var normalArchimondeTimestamp = 0;
                var heroicArchimondeTimestamp = 0;
                var mythicArchimondeTimestamp = 0;

                $('table.rating a.boss_kills_link').each(function (i, elem) {

                    var kill = {region: region.toLowerCase(), realm: realm, name: name};

                    var bossName = $(this).text();


                    var bossArray = bossName.replace(/(^\+)/g, "").trim().split(':');
                    kill["boss"] = bossArray[1].trim();

                    if (bossArray[0] == 'N') {
                        kill["difficulty"] = 'normal';
                        normalCount++;
                    } else if (bossArray[0] == 'H') {
                        kill["difficulty"] = 'heroic'
                        heroicCount++;
                    } else if (bossArray[0] == 'M') {
                        kill["difficulty"] = 'mythic';
                        mythicCount++;
                    } else {
                        callback(new Error("WOWPROGRESS_PARSING_ERROR"));
                    }

                    if (kill["boss"] == "Xhul&apos;horac") {
                        kill["boss"] = "Xhul'horac";
                    }
                    var date = $(this).parent().next().text();
                    var timestamp = new Date(date + " GMT+0000").getTime();


                    if (isNaN(timestamp)) {
                        timestamp = new Date(date.substring(1, date.length) + " GMT+0000").getTime();
                    }

                    if (isNaN(timestamp) || timestamp < 1388534400000) {
                        timestamp = parseInt($(this).parent().next().find('.datetime').attr('data-ts'), 10) * 1000;
                    }


                    //Fix incorrect kill ...
                    if (kill["boss"] == "Archimonde") {
                        bestTimestamp = timestamp;

                        if (kill["difficulty"] == "normal") {
                            normalArchimonde = true;
                            normalArchimondeTimestamp = timestamp;
                        } else if (kill["difficulty"] == "heroic") {
                            heroicArchimonde = true;
                            heroicArchimondeTimestamp = timestamp;
                        } else if (kill["difficulty"] == "mythic") {
                            mythicArchimonde = true;
                            mythicArchimondeTimestamp = timestamp;
                        }

                    }

                    if (timestamp > bestTimestamp) {
                        kill["timestamp"] = bestTimestamp;
                    } else {
                        kill["timestamp"] = timestamp;
                    }


                    if (kill["timestamp"] < new Date("Jun 01 2016 GMT+0000").getTime()) {
                        kills.push(kill);
                    }


                });


                var bossList = [
                    "Hellfire Assault",
                    "Iron Reaver",
                    "Kormrok", "Hellfire High Council",
                    "Kilrogg Deadeye",
                    "Gorefiend",
                    "Shadow-Lord Iskar",
                    "Socrethar the Eternal",
                    "Tyrant Velhari",
                    "Fel Lord Zakuun",
                    "Xhul'horac",
                    "Mannoroth",
                    "Archimonde"];

                if (normalArchimonde && normalCount < 13) {
                    var normalKills = [];
                    async.forEach(bossList, function (boss) {
                        var normalKill = {};
                        normalKill.boss = boss;
                        normalKill.difficulty = "normal";
                        normalKill.region = region.toLowerCase();
                        normalKill.realm = realm;
                        normalKill.name = name;
                        normalKill.timestamp = normalArchimonde;
                        normalKills.push(normalKill);

                    });
                    kills.concat(normalKills);

                }


                if (heroicArchimonde && heroicCount < 13) {
                    var heroicKills = [];
                    async.forEach(bossList, function (boss) {
                        var heroicKill = {};
                        heroicKill.boss = boss;
                        heroicKill.difficulty = "heroic";
                        heroicKill.region = region.toLowerCase();
                        heroicKill.realm = realm;
                        heroicKill.name = name;
                        heroicKill.timestamp = heroicArchimondeTimestamp;
                        heroicKills.push(heroicKill);

                    });
                    kills = kills.concat(heroicKills);
                }
                if (mythicArchimonde && mythicCount < 13) {
                    var mythicKills = [];
                    async.forEach(bossList, function (boss) {
                        var mythicKill = {};
                        mythicKill.boss = boss;
                        mythicKill.difficulty = "mythic";
                        mythicKill.region = region.toLowerCase();
                        mythicKill.realm = realm;
                        mythicKill.name = name;
                        mythicKill.timestamp = mythicArchimondeTimestamp;
                        mythicKills.push(mythicKill);
                    });
                    kills = kills.concat(mythicKills);
                }
                kills = _.uniqBy(kills, function (elem) {
                    return elem.boss + elem.difficulty;
                });
                callback(null, kills);
            }

        ],
        function (error, kills) {
            callback(error, kills);
        }
    );

};


