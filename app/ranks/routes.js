"use strict";

//Load dependencies
var router = require("express").Router();
var rankController = process.require("ranks/rankController.js");

//Define routes
router.get('/ranks/:tier/:raid/:region/:realm/:name', rankController.getRank);
router.get('/ranks/:tier/:raid', rankController.getRanking);
router.get('/ranks/:tier/:raid/:region', rankController.getRanking);
router.get('/ranks/:tier/:raid/:region/:realm', rankController.getRanking);

module.exports = router;