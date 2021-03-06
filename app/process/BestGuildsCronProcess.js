"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var rankModel = process.require("ranks/rankModel.js");
var updateModel = process.require("updates/updateModel.js");

/**
 * BestGuildsCronProcess constructor
 * @constructor
 */
function BestGuildsCronProcess() {
}

BestGuildsCronProcess.prototype.runCron = function () {
    var logger = applicationStorage.logger;
    var config = applicationStorage.config;

    async.forEach(config.progress.raids,function(raid,callback){
        async.waterfall([
            function(callback){
                //Load all guild in progress
                rankModel.getRanking("tier_"+raid.tier+"#"+raid.name,0,1000,function(error,ranking){
                    callback(error,ranking);
                });
            },
            function(ranking,callback) {
                async.forEachSeries(ranking,function(guildStr,callback){
                    var guildArray = guildStr.split('#');

                    updateModel.insert("wp_gu", guildArray[0], guildArray[1], guildArray[2], 5, function (error) {
                        logger.info("Insert guild progress %s-%s-%s to update with priority 5", guildArray[0], guildArray[1], guildArray[2]);
                        if(error){
                            logger.error(error.message);
                        }
                        callback(error);
                    });
                },function(error){
                    callback(error);
                });
            }
        ],function(error){
            if (error){
                logger.error(error.message);
            }
            callback();
        });
    },function(error){
        if (error){
            logger.error(error.message);
        }
        process.exit();
    });


};

/**
 * Start BestGuildsCronProcess
 * @param callback
 */
BestGuildsCronProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting BestGuildsCronProcess");
    this.runCron();
    callback();
};

module.exports = BestGuildsCronProcess;