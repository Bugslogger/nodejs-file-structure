const { Success, internalError } = require("../utils/helpers/status.code");

exports.logout = async (req, res, next, serverStorage) => {
  const { uid } = req.user;
  console.log(req.user);

  if (serverStorage.has(uid)) {
    serverStorage.delete(uid);
    return Success(res, { message: "user logged out successfully." });
  }
  internalError(res, "We gatchu! Please try again later.");
};
