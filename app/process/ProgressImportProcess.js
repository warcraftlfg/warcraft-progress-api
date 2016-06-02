"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var wowprogressAPI = process.require("core/api/wowprogress.js");


/**
 * CharacterUpdateProcess constructor
 * @constructor
 */
function ProgressImportProcess() {
}

/**
 * Update Old Progress
 */
ProgressImportProcess.prototype.import = function () {

    var logger = applicationStorage.logger;
    var self = this;

    var maxPage = 2471;
    var count = 0;
    async.whilst(
        function () {
            return count <= maxPage;
        },
        function (callback) {


            async.waterfall([
                function (callback) {
                    wowprogressAPI.getGuildsUrlsOnPage(count, function (error, guildUrls) {
                        callback(error, guildUrls);
                    });
                },
                function (guildUrls, callback) {
                    async.forEach(guildUrls, function (guildUrl,callback) {
                        async.waterfall([
                            function(callback){
                                //Get Kills
                                wowprogressAPI.getKills(guildUrl,function(error,kills){
                                    callback(error,kills);
                                });

                            },
                            function(kills,callback){
                                //Push Kills
                                callback();
                            }
                        ],function(){
                            callback();
                        });
                    }, function () {
                        callback();
                    });
                }
            ], function (error) {
                if (error)
                    logger.error(error.message);
                count++;
                callback(null, count);
            });

        },
        function (err, n) {
            if (error && error !== true) {
                logger.error(error.message);
            }
            self.import();
        }
    );
};

/**
 * Start ProgressImportProcess
 * @param callback
 */
ProgressImportProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting ProgressImportProcess");
    this.import();
    callback();
};

module.exports = ProgressImportProcess;