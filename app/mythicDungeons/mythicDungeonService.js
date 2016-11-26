"use strict";

var request = require("request");
var cheerio = require("cheerio");
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var mythicDungeonModel = process.require("mythicDungeons/mythicDungeonModel.js");


module.exports.getRuns = function (realm, dungeon, realmsSlugArray, callback) {
    var self = this;
    async.waterfall([
        function (callback) {
            self.getPage(realm.region, realm.bnet.slug, dungeon.slug, function (error, body) {
                callback(error, body);
            });
        }, function (body, callback) {
            self.parsePage(body, realmsSlugArray, dungeon, function (error, runs, affixes) {
                callback(error, runs, affixes);
            });
        }, function (runs, affixes, callback) {
            self.insertRuns(runs, affixes, dungeon, realm, function (error) {
                callback(error);
            });
        }
    ], function (error) {
        callback(error);
    });
};


module.exports.getPage = function (region, realmSlug, dungeonSlug, callback) {
    var logger = applicationStorage.logger;

    var regionSlug = region == "us" ? "en_us" : "en_gb";

    var url = "https://worldofwarcraft.com/" + regionSlug + "/game/pve/leaderboards/" + realmSlug + "/" + dungeonSlug;

    request.get({method: "GET", uri: url, gzip: true}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            logger.info("Success on " + url);

            callback(null, body);
        } else if (!error) {
            error = new Error("Error HTTP " + response.statusCode + " on fetching bnet site " + url);
            error.statusCode = response.statusCode;
            callback(error);
        }
        else {
            callback(error);
        }
    });
};


module.exports.parsePage = function (body, realmsSlugArray, dungeon, callback) {
    var logger = applicationStorage.logger;

    var $ = cheerio.load(body);

    var affixes = [];
    $('.Box.Box--leather.Box--flush.bordered .List.List--vertical .List-item .font-semp-medium-white').each(function () {
        affixes.push($(this).text());
    });

    if (affixes.length != 3) {
        return callback(new Error("Cannot found 3 affixes"));
    }
    var runs = [];
    $('.Pagination-page .SortTable-body .SortTable-row').each(function () {
        var run = {};
        var count = 0;
        $(this).find(".SortTable-col").each(function () {
            if (count == 1) {
                run.level = parseInt($(this).attr("data-value"), 10);
            }
            if (count == 2) {
                run.time = parseInt($(this).attr("data-value"), 10);
            }
            if (count == 3) {
                run.faction = $(this).attr("data-value") == "alliance" ? 0 : 1;
                run.roster = [];
                $(this).find(".List-item.gutter-tiny").each(function () {
                    var character = {};

                    //FIND CLASS
                    var classe = $(this).find("a").attr("class");
                    if (classe.indexOf("WARRIOR") != -1) {
                        character.class = 1;
                    } else if (classe.indexOf("PALADIN") != -1) {
                        character.class = 2;
                    } else if (classe.indexOf("DEMONHUNTER") != -1) {
                        character.class = 12;
                    } else if (classe.indexOf("HUNTER") != -1) {
                        character.class = 3;
                    } else if (classe.indexOf("ROGUE") != -1) {
                        character.class = 4;
                    } else if (classe.indexOf("PRIEST") != -1) {
                        character.class = 5;
                    } else if (classe.indexOf("DEATHKNIGHT") != -1) {
                        character.class = 6;
                    } else if (classe.indexOf("SHAMAN") != -1) {
                        character.class = 7;
                    } else if (classe.indexOf("MAGE") != -1) {
                        character.class = 8;
                    } else if (classe.indexOf("WARLOCK") != -1) {
                        character.class = 9;
                    } else if (classe.indexOf("MONK") != -1) {
                        character.class = 10;
                    } else if (classe.indexOf("DRUID") != -1) {
                        character.class = 11;
                    } else {
                        character.class = 0;
                        logger.error("Character Class not found");
                    }

                    //FIND ROLE
                    var role = $(this).find(".Character-role span").attr("class");
                    if (role) {
                        if (role.indexOf("tank") != -1) {
                            character.role = "tank";
                        } else if (role.indexOf("healer") != -1) {
                            character.role = "healer";
                        }
                    } else {
                        character.role = "dps";
                    }

                    //FIND REALM
                    character.realm = realmsSlugArray[$(this).find("a").attr("href").split('/')[6]];

                    //FIND NAME
                    character.name = $(this).text();
                    run.roster.push(character);
                });
            }
            if (count == 4) {
                run.date = Date.parse($(this).attr("data-value"));
            }
            count++;
        });

        if (run.time < dungeon.time) {
            runs.push(run);
        } else {
            logger.verbose("Run not valid " + run.time + ">" + dungeon.time);
        }
    });

    callback(null, runs, affixes);
};

module.exports.insertRuns = function (runs, affixes, dungeon, realm, callback) {
    var logger = applicationStorage.logger;

    async.forEachSeries(runs, function (run, callback) {

        run.dungeon = dungeon.name;
        run.realm = realm.name;
        run.region = realm.region;
        run.affixes = affixes;


        mythicDungeonModel.findOne("legion", run, function (error, result) {
            if (result) {
                logger.info("Run for dungeon %s level %s for %s-%s in %s ms already exist, skip it", run.dungeon, run.level, run.region, run.realm, run.time);
                callback();
            } else {
                logger.info("Insert run for dungeon %s level %s for %s-%s in %s ms", run.dungeon, run.level, run.region, run.realm, run.time);
                mythicDungeonModel.insertOne("legion", run, function (error) {
                    callback(error);
                });

            }
        });


    }, function (error) {
        callback(error);
    })

};
