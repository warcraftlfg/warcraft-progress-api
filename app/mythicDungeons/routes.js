"use strict";

//Load dependencies
var router = require("express").Router();
var rankController = process.require("mythicDungeons/mythicDungeonController.js");

//Define routes
router.get('/dungeons/:extension/', rankController.getRanking);

module.exports = router;