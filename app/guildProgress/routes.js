"use strict";

//Load dependencies
var router = require("express").Router();
var guildProgressController = process.require("guildProgress/guildProgressController.js");

//Define routes
router.get('/progress/:tier/:region/:realm/:name', guildProgressController.getProgress);
router.get('/progress/simple/:tier/:region/:realm/:name', guildProgressController.getProgressSimple);

module.exports = router;