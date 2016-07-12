"use strict";

//Load dependencies
var async = require("async");
var applicationStorage = process.require("core/applicationStorage.js");
var bnetAPI = process.require("core/api/bnet.js");
var updateModel = process.require("updates/updateModel.js");
var updateService = process.require("updates/updateService.js");
var characterService = process.require("characters/characterService.js");


/**
 * CharacterUpdateProcess constructor
 * @constructor
 */
function CharacterUpdateProcess() {
}

/**
 * Update one character
 */
CharacterUpdateProcess.prototype.updateCharacter = function () {

    var logger = applicationStorage.logger;
    var self = this;
    async.waterfall([
        function (callback) {
            //Get next guild to update
            updateService.getNextUpdate('wp_cu', function (error, characterUpdate) {
                if (characterUpdate == null) {
                    //Guild update is empty
                    logger.info("No character to update ... waiting 3 sec");
                    setTimeout(function () {
                        callback(true);
                    }, 3000);
                } else {
                    logger.info("Update character %s-%s-%s", characterUpdate.region, characterUpdate.realm, characterUpdate.name);

                    //CN PATCH
                    if (characterUpdate.region == 'cn') {
                        callback(true);
                    } else {
                        callback(error, characterUpdate);

                    }


                }
            });
        },
        function (characterUpdate, callback) {
            //Sanitize name
            bnetAPI.getCharacter(characterUpdate.region, characterUpdate.realm, characterUpdate.name, ["items", "guild", "talents", "progression"], function (error, character) {
                if (error) {
                    if (error.statusCode == 403) {
                        logger.info("Bnet Api Deny ... waiting 1 min");
                        updateModel.insert("wp_cu", characterUpdate.region, characterUpdate.realm, characterUpdate.name, characterUpdate.priority, function () {
                            setTimeout(function () {
                                callback(true);
                            }, 60000);
                        });
                    } else {
                        callback(error);
                    }
                } else {
                    if (character && character.realm && character.name) {
                        callback(error, characterUpdate.region, character);
                    } else {
                        logger.warn("Bnet return empty character (account inactive...), skip it");
                        callback(true);
                    }
                }

            })
        },
        function (region, character, callback) {
            characterService.parseProgress(region, character, function (error) {
                callback(error);
            });
        }
    ], function (error) {
        if (error && error !== true) {
            logger.error(error.message);
        }
        self.updateCharacter();
    });
};

/**
 * Start characterUpdateProcess
 * @param callback
 */
CharacterUpdateProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting CharacterUpdateProcess");
    this.updateCharacter();
    callback();
};

module.exports = CharacterUpdateProcess;