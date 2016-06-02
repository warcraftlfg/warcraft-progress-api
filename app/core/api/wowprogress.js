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
            callback(error, body);
        } else {
            callback(new Error("Error HTTP " + response.statusCode + " on fetching wowprogress api " + url));
        }
    });
};

module.exports.getGuildsUrlsOnPage = function (number, callback) {
    var self = this;
    async.waterfall([
        function (callback) {
            if(number == -1 ){
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

                var $body = cheerio.load(body);


                var armoryUrl = decodeURIComponent(($body('.armoryLink').attr('href')));

                if (armoryUrl == "undefined") {
                    return callback(new Error('Armory link undefined'));
                }
                try {
                    var name = $body('h1').text().match("“(.*)” WoW Guild")[1];
                    var realm = armoryUrl.match('battle.net/wow/guild/(.*)/(.*)/')[1];
                    var region = armoryUrl.match('http://(.*).battle.net/wow/guild/')[1];
                } catch (e) {
                    logger.info("Parsing error, trying CN");
                    try {
                        var name = $body('h1').text().match("“(.*)” WoW Guild")[1];
                        var realm = armoryUrl.match('www.battlenet.com.cn/wow/guild/(.*)/(.*)/')[1];
                        var region = armoryUrl.match('http://www.battlenet.com.(.*)/wow/guild/')[1];
                    } catch (e) {
                        logger.error("Error on page parsing %s", url);
                        callback(true);
                    }
                }

                bnetAPI.getGuild(region, realm, name, [], function (error, guild) {
                    if (guild == null) {
                        logger.warn("Bnet return empty guild %s-%s-%s, skip it", region, realm, name);
                        callback(true);
                    }
                    callback(error, $body, region, guild.realm, guild.name);
                });


            }
            ,
            function ($, region, realm, name, callback) {
                var kills = [];


                $('body').find('table.rating tr td span').each(function (i, elem) {

                            console.log($(this).html());






                });

                /*var tables = $body('table.rating').html();
                var pattern = /<td><span style="white-space:nowrap"[^>]*([^<]*)[^<]*)/span[^>]
                var array;
                var array2;
                var bosses = [];

                async.waterfall([
                    function (callback) {
                        async.whilst(function () {
                            return array = pattern.exec(tables)
                        }, function (callback) {
                            var boss = array[2];
                            var boss_id = array[1];
                            bosses.push({name: boss, timestamp: timestamp * 1000});


                            self.getWoWProgressPage(url + "?boss_kills=" + boss_id, function (error, body) {
                                if (error) {
                                    callback();
                                } else {
                                    var pattern2 = /data-ts="([^"]*)" data-hint=/gi;
                                    async.whilst(function () {
                                            return array2 = pattern2.exec(body)
                                        }, function (callback) {
                                            var timestamp = parseInt(array2[1], 10);
                                            if (!isNaN(timestamp)) {

                                            }
                                            callback();
                                        },
                                        function () {
                                            callback();
                                        });
                                }
                            });
                        }, function () {
                            callback(null, bosses);
                        });
                    },
                    function (bosses, callback) {
                        async.each(bosses, function (boss, callback) {
                            var kill = {region: region.toLowerCase(), realm: realm, name: name};

                            kill["timestamp"] = boss.timestamp;
                            boss = boss.name.replace(/(^\+)/g, "").trim().split(':');
                            kill["boss"] = boss[1].trim();
                            if (boss[0] == 'N') {
                                kill["difficulty"] = 'normal';
                            } else if (boss[0] == 'H') {
                                kill["difficulty"] = 'heroic'
                            } else if (boss[0] == 'M') {
                                kill["difficulty"] = 'mythic';
                            } else {
                                callback(new Error("WOWPROGRESS_PARSING_ERROR"));
                            }


                            if (kill["boss"] == "Xhul&apos;horac") {
                                kill["boss"] = "Xhul'horac";
                            }
                            kills.push(kill);
                            callback();

                        }, function () {
                            callback();
                        });

                    }
                ], function (error) {
                    if (!error) {
                        logger.info("Found %s kills for guild %s-%s-%s", kills.length, region, realm, name);
                    }
                    callback(error, kills);

                });
                 */
            }

        ],
        function (error,kills) {
            callback(error, kills);
        }
    );

};


