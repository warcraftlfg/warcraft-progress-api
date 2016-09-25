"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var statModel = process.require("stats/statModel.js");


module.exports.getBossStats = function (req, res, next) {
    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var limit = 200;
    if (!isNaN(parseInt(req.query.limit, 10))) {
        limit = parseInt(req.query.limit, 10);
        if (limit > 200) {
            limit = 200
        }
        if (limit < 1) {
            limit = 1;
        }
    }
    statModel.getStats(parseInt(req.params.tier, 10), req.params.raid, "guild", limit, function (error, stats) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (stats) {
            res.json(stats);
        } else {
            next();
        }
    });
};