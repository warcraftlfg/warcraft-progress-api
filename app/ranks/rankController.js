"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var rankModel = process.require("ranks/rankModel.js");

module.exports.getRank = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    async.parallel({
        world: function (callback) {
            rankModel.getRank(req.params.tier, req.params.region, req.params.realm, req.params.name, function (error, rank) {
                callback(error, rank)
            });
        },
        region: function (callback) {
            rankModel.getRank(req.params.tier + "_" + req.params.region, req.params.region, req.params.realm, req.params.name, function (error, rank) {
                callback(error, rank)
            });
        }
    }, function (error, result) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (result.world !== null && result.region != null) {
            result.world++;
            result.region++;
            res.json(result);
        } else {
            next();
        }
    });
};


module.exports.getRanking = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var start = 0;
    if (req.query && req.query.start) {
        start = parseInt(req.query.start, 10) > 0 ? parseInt(req.query.start, 10) - 1 : 0
    }

    var end = start + 99;
    if (req.query && req.query.limit) {
        var limit = parseInt(req.query.limit, 10);

        if (limit < 0)
            limit = 99;

        if (limit > 500)
            limit = 500;

        end = start + limit;
    }

    var key = req.params.tier;
    if (req.params.region) {
        key = req.params.tier + "_" + req.params.region;
    }

    rankModel.getRanking(key, start, end, function (error, ranking) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (ranking) {
            var finalRanking = {};
            var counter = 1;
            async.each(ranking, function (rank, callback) {
                var rankArray = rank.split('-');
                finalRanking[start + counter] = {region: rankArray[0], realm: rankArray[1], name: rankArray[2]};
                counter++;
                callback();
            }, function () {
                res.json(finalRanking);
            });
        } else {
            next();
        }
    });

};