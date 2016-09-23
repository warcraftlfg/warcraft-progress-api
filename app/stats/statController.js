"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var guildProgressModel = process.require("guildProgress/guildProgressModel.js");


module.exports.getBossStat = function (req, res, next) {
    var logger = applicationStorage.logger;
    var config = applicationStorage.config;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    async.waterfall([
        function (callback) {
            var stats = {};
            var bosses = [
                "Nythendra",
                "Elerethe Renferal",
                "Il'gynoth, Heart of Corruption",
                "Ursoc",
                "Dragons of Nightmare",
                "Cenarius",
                "Xavius"
            ];
            async.eachSeries(config.progress.difficulties, function (difficulty, callback) {
                stats[difficulty] = {};
                async.eachSeries(bosses, function (boss, callback) {
                    guildProgressModel.getBossKillCount(req.params.tier, req.params.raid, difficulty, boss, function (error, count) {
                        stats[difficulty][boss] = count;
                        callback(error);
                    });
                }, function (error) {
                    callback(error);
                });
            }, function (error) {
                callback(error, stats);
            });
        }
    ], function (error, result) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (result) {
            res.json(result);
        } else {
            next();
        }
    })
};