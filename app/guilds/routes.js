"use strict";

//Load dependencies
var router = require("express").Router();
var guildController = process.require("guilds/guildController.js");

//Define routes
router.post('/guilds/:region/:realm/:name', guildController.getGuild);


module.exports = router;