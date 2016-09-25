"use strict";

//Load dependencies
var router = require("express").Router();
var statController = process.require("stats/statController.js");

//Define routes
router.get('/stats/guild/:tier/:raid/', statController.getGuildStats);
router.get('/stats/character/class/:tier/:raid/', statController.getCharacterClassStats);


module.exports = router;