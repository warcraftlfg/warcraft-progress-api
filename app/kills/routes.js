"use strict";

//Load dependencies
var router = require("express").Router();
var killController = process.require("kills/killController.js");

//Define routes
router.get('/kills/:tier/:raid/:region/:realm/:name/:difficulty/:boss/:timestamp', killController.getKill);


module.exports = router;