"use strict";

//Load dependencies
var applicationStorage = process.require("core/applicationStorage.js");
var mythicDungeonModel = process.require("mythicDungeons/mythicDungeonModel.js");

module.exports.getRanking = function (req, res, next) {

    var logger = applicationStorage.logger;
    logger.info("%s %s %s %s", req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.method, req.path, JSON.stringify(req.params));

    var criteria = {};

    if (req.query && req.query.region) {
        criteria.region = req.query.region;
    }

    if (req.query && req.query.affixes) {
        criteria.affixes = req.query.affixes.split(' ');
    }

    if (req.query && req.query.dungeon) {
        criteria.dungeon = req.query.dungeon;
    }
    var limit;
    if (req.query && req.query.limit) {
        limit = parseInt(req.query.limit, 10);

        if (limit < 0) {
            limit = 50;
        }

        if (limit > 50) {
            limit = 50;
        }

    } else {
        limit = 50;
    }

    mythicDungeonModel.find(req.params.extension, criteria, limit, function (error, runs) {


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