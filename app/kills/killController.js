"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");
var killModel = process.require("kills/killModel.js");

module.exports.getKill = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    killModel.find(req.params.tier,{
        region: req.params.region,
        realm: req.params.realm,
        name: req.params.name,
        boss: req.params.boss,
        difficulty: req.params.difficulty,
        timestamp: parseInt(req.params.timestamp,10)
    }, function (error, kills) {
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (kills && kills.length > 0) {
            res.json(kills[0]);
        } else {
            next();
        }
    });
};