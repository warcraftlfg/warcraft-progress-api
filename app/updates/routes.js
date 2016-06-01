"use strict";

//Load dependencies
var router = require("express").Router();
var updateController = process.require("updates/updateController.js");

//Define routes
router.post('/updates', updateController.postUpdate);


module.exports = router;