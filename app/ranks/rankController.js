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