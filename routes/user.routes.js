const express = require("express");
const router = express.Router();
const db = require("../models/db.connect");

// route controller
const usercontroller = require("../controllers/user.controller");

// middleware
const auth = require("../middleware/auth.middleware");

const serverStorage = express.serverStorage;

router.get(
  "/user/logout",
  (req, res, next) => [auth.isTokenValid(req, res, next, serverStorage)],
  (req, res, next) => usercontroller.logout(req, res, next, serverStorage)
);

module.exports = router;
