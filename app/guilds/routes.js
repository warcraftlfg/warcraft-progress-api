"use strict";

//Load dependencies
var router = require("express").Router();
var guildController = process.require("guilds/guildController.js");

//Define routes
router.get('/guilds/:tier/:region/:realm/:name', guildController.getGuildWithTier);
router.get('/guilds/:region/:realm/:name', guildController.getGuild);
router.get('/guilds/progress/:tier/:region/:realm/:name', guildController.getProgress);

module.exports = router;