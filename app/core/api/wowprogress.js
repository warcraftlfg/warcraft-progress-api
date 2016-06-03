"use strict";

//Load dependencies
var request = require("request");

//Configuration
var applicationStorage = process.require("core/applicationStorage.js");
var cheerio = require("cheerio");
var async = require("async");
var bnetAPI = process.require("core/api/bnet.js");


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
                        var realm = armoryUrl.match('www.battlenet.com.cn/wow/guild/(.*)/(.*)/')[1];
                        var region = armoryUrl.match('http://www.battlenet.com.(.*)/wow/guild/')[1];
                    } catch (e) {
                        logger.error("Error on page parsing %s", url);
                        callback(true);
                    }
                }

                bnetAPI.getGuild(region, realm, name, [], function (error, guild) {
                    if (!guild || !guild.realm || !guild.name) {
                        logger.warn("Bnet return empty guild %s-%s-%s, skip it", region, realm, name);
                        callback(true);
                    } else {
                        callback(error, $, region, guild.realm, guild.name);
                    }
                });


            }
            ,
            function ($, region, realm, name, callback) {
                var kills = [];

                var bestTimestamp = 999999999999999999999;
                $('table.rating a.boss_kills_link').each(function (i, elem) {

                    var kill = {region: region.toLowerCase(), realm: realm, name: name};

                    var bossName = $(this).text();


                    var bossArray = bossName.replace(/(^\+)/g, "").trim().split(':');
                    kill["boss"] = bossArray[1].trim();

                    if (bossArray[0] == 'N') {
                        kill["difficulty"] = 'normal';
                    } else if (bossArray[0] == 'H') {
                        kill["difficulty"] = 'heroic'
                    } else if (bossArray[0] == 'M') {
                        kill["difficulty"] = 'mythic';
                    } else {
                        callback(new Error("WOWPROGRESS_PARSING_ERROR"));
                    }

                    if (kill["boss"] == "Xhul&apos;horac") {
                        kill["boss"] = "Xhul'horac";
                    }
                    var date = $(this).parent().next().text();
                    var timestamp = new Date(date + " GMT+0000").getTime();

                    if(isNaN(timestamp)){
                        timestamp = parseInt($(this).parent().next().find('.datetime').attr('data-ts'),10)*1000;
                    }

                    //Fix incorrect kill ...
                    if (kill["boss"] == "Archimonde")
                        bestTimestamp = timestamp;

                    if (timestamp > bestTimestamp)
                        kill["timestamp"] = bestTimestamp;
                    else
                        kill["timestamp"] = timestamp;


                    if (kill["timestamp"] < new Date("Jun 01 2016 GMT+0000").getTime())
                        kills.push(kill);


                });
                callback(null, kills)
            }

        ],
        function (error, kills) {
            callback(error, kills);
        }
    )
    ;

};


