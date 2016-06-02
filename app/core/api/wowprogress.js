"use strict";

//Load dependencies
var request = require("request");

//Configuration
var applicationStorage = process.require("core/applicationStorage.js");
var cheerio = require("cheerio");
var async = require("async");

module.exports.getWoWProgressPage = function (path, callback) {
    var url = "http://www.wowprogress.com" + path;
    var logger = applicationStorage.logger;
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
            self.getWoWProgressPage("/pve/rating/next/" + number + "/rating", function (error, body) {
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

    async.waterfall([
            function (callback) {
                self.getWoWProgressPage(url, function (error, body) {
                    callback(error, body)
                })
            },
            function (body, callback) {
                var $ = cheerio.load(body);
                var tables = $('body').find('table.rating a.boss_kills_link');

                (function iterate(idx) {
                    process.nextTick(function () {
                        for (var i = 0; i < 1e3 && (i + idx) < tables.length; i++) {

                            var bossKillNumber = $(tables[i + idx]).attr("data-aid");
                            self.getWoWProgressPage(url + "?boss_kills=" + bossKillNumber, function (error, body) {
                                console.log("BODY");
                                //TODO SYNCRONE ...
                            });

                        }
                    });

                    if (idx + 1e3 < tables.length) iterate(idx + 1e3);
                }(0));


                console.log("PAFFFF");
                callback(null);

            }
        ],
        function (error) {
            callback(error);
        }
    )
    ;

};


