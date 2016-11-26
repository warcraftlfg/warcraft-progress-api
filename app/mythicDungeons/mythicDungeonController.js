"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");
var mythicDungeonModel = process.require("mythicDungeons/mythicDungeonModel.js");

module.exports.getRanking = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    mythicDungeonModel.find(req.params.extension, {}, function (error, runs) {
        console.log(runs);
        if (error) {
            logger.error(error.message);
            res.status(500).send(error.message);
        } else if (runs && runs.length > 0) {
            res.json(runs);
        } else {
            next();
        }
    });
};