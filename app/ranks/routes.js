"use strict";

//Load dependencies
var router = require("express").Router();
var rankController = process.require("ranks/rankController.js");

//Define routes
router.get('/ranks/:tier/:region/:realm/:name', rankController.getRank);


module.exports = router;