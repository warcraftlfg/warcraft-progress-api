"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");
var killModel = process.require("kills/killModel.js");

module.exports.getKill = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    killModel.find(
        req.params.raid,
        req.params.region,
        req.params.realm,
        req.params.name,
        req.params.difficulty,
        req.params.boss,
        req.params.timestamp.split(','),
        function (error, players) {
            if (error) {
                logger.error(error.message);
                res.status(500).send(error.message);
            } else if (players) {
                res.json(players);
            } else {
                next();
            }
        }
    )
    ;
}
;