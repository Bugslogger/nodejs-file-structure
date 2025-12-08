const db = require("../models/db.connect");
const { verifyToken } = require("../utils/helpers/app.helper");
const { Unauthorized } = require("../utils/helpers/status.code");
const User = db.user;

exports.isTokenValid = async (req, res, next, storage) => {
  try {
    const token = req.headers.authorization;

    if (!token || !token.startsWith("Bearer")) {
      return Unauthorized(res, "Missing auth token");
    }

    const tkn = token.split(" ")[1];
    const status = await verifyToken(tkn);
    console.log("status: ", !!status && !!status["userId"]);
    if (!!status && !!status["userId"]) {
      const user = await User.findByPk(status["userId"]);
      if (user) {
        if (storage.has(user?.dataValues?.uid)) {
          const sessionToken = storage.get(user?.dataValues?.uid);
          if (sessionToken === tkn) {
            req.user = user?.dataValues;
            next();
          } else {
            return Unauthorized(res, "Invalid token");
          }
        } else {
          return Unauthorized(res, "You are not logged in.");
        }
      }

      next();
    } else {
      return Unauthorized(res, status || "Invalid Auth token!");
    }
  } catch (error) {
    return error.message;
  }
};
