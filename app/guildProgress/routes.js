"use strict";

//Load dependencies
var router = require("express").Router();
var guildProgressController = process.require("guildProgress/guildProgressController.js");

//Define routes
router.get('/progress/:tier/:raid/:region/:realm/:name', guildProgressController.getProgress);
router.get('/progress/simple/:tier/:raid/:region/:realm/:name', guildProgressController.getProgressSimple);
router.get("/search/:text", guildProgressController.searchGuild);

module.exports = router;