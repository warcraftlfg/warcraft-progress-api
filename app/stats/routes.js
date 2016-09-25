"use strict";

//Load dependencies
var router = require("express").Router();
var statController = process.require("stats/statController.js");

//Define routes
router.get('/stats/guild/:tier/:raid/', statController.getBossStats);
router.get('/stats/class/:tier/:raid/', statController.getBossStats);


module.exports = router;