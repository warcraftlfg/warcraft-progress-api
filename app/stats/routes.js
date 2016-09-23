"use strict";

//Load dependencies
var router = require("express").Router();
var statController = process.require("stats/statController.js");

//Define routes
router.get('/stats/boss/:tier/:raid/', statController.getBossStats);


module.exports = router;