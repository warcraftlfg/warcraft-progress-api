"use strict";

//Load dependencies
var router = require("express").Router();
var rankController = process.require("ranks/rankController.js");

//Define routes
router.get('/ranks/:tier/:region/:realm/:name', rankController.getRank);
router.get('/ranks/:tier', rankController.getRanking);
router.get('/ranks/:tier/:region', rankController.getRanking);
router.get('/ranks/:tier/:region/:realm', rankController.getRanking);

module.exports = router;