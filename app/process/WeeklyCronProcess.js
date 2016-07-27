"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var rankModel = process.require("ranks/rankModel.js");
var updateModel = process.require("updates/updateModel.js");

/**
 * WeeklyCronProcess constructor
 * @constructor
 */
function WeeklyCronProcess() {
}

WeeklyCronProcess.prototype.runCron = function () {
    var logger = applicationStorage.logger;
    var config = applicationStorage.config;

    async.forEach(config.progress.raids,function(raid,callback){
        async.waterfall([
            function(callback){
                //Load all guild in progress
                rankModel.getRanking(raid.tier,0,999999,function(error,ranking){
                    callback(error,ranking);
                });
            },
            function(ranking,callback) {
                async.forEachSeries(ranking,function(guildStr,callback){
                    var guildArray = guildStr.split('-');
                    updateModel.insert("wp_gu", guildArray[0], guildArray[1], guildArray[2], 3, function (error) {
                        logger.info("Insert guild %s-%s-%s to update with priority 3", guildArray[0], guildArray[1], guildArray[2]);
                        if(error){
                            logger.error(error.message);
                        }
                        callback();
                    });
                },function(){
                    callback();
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
 * Start WeeklyCronProcess
 * @param callback
 */
WeeklyCronProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting WeeklyCronProcess");
    this.runCron();
    callback();
};

module.exports = WeeklyCronProcess;