const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const {
  Success,
  badRequest,
  notFound,
  internalError,
} = require("../utils/helpers/status.code");
const {
  createToken,
  checkUserPasswordForgetLink,
  sendMail,
} = require("../utils/helpers/app.helper");
const { VERIFICATION_LINK_EXPIRY } = require("../config/server.config");

exports.login = async (req, res, next, storage, db) => {
  const { email, password } = req.body;
  const User = db.user;

  if (!email) {
    return badRequest(res, "Missing email address from body.");
  }

  if (!password) {
    return badRequest(res, "Missing password from body.");
  }

  try {
    const isEmailExits = await User.findOne({ where: { email } });
    if (!isEmailExits) {
      return notFound(res, "User not found");
    }

    if (!isEmailExits?.dataValues?.isVerified) {
      return notFound(
        res,
        "User not found you can try creating a new account."
      );
    }

    const Password = isEmailExits?.dataValues?.password;
    const isValidPassword = bcrypt.compareSync(password, Password);

    if (isValidPassword) {
      if (storage.has(isEmailExits?.dataValues?.uid)) {
        storage.delete(isEmailExits?.dataValues?.uid);
      }

      const token = createToken(isEmailExits?.dataValues?.id, "user");

      storage.set(isEmailExits?.dataValues?.uid, token);
      Success(res, {
        statuscode: 1,
        token,
      });
    } else {
      return badRequest(res, "Invalid password");
    }
  } catch (error) {
    // next();
    console.log(error);

    internalError(res, error);
  }
};

exports.create = async (req, res, next, serverStorage, db) => {
  const { email, password, username } = req.body;
  const validatePassword =
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
  const User = db.user;

  if (!email) {
    return badRequest(res, "Missing email address from body.");
  }

  if (!password) {
    return badRequest(res, "Missing password from body.");
  }

  if (!validatePassword.test(password)) {
    Success(res, {
      message: `Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character, and be at least 8 characters long.`,
      statuscode: 0,
    });
    return;
  }

  if (!username) {
    return badRequest(res, "Missing username from body.");
  }

  if (!serverStorage) {
    return internalError(res);
  }

  try {
    const uid = uuidv4();

    // generate hashpassword
    const hashPassword = bcrypt.hashSync(password, process.env.SALT);

    const createUser = await User.create({
      fullname: username,
      email,
      password: hashPassword,
      uid,
      role: "user",
    });

    if (!createUser || createUser == null) {
      return internalError(res, "Failed to create new user.");
    }

    // after data has been inserted into table.
    // it will send email to the users email address for verifying the email address.
    const template = require("../view/email-templates/verifyUser")({
      email,
      link: `${
        process.env.NODE_ENV === "development"
          ? process.env.DEV_BASE_URL
          : process.env.PROD_BASE_URL
      }/api/auth/verify-user?id=${uid}`,
    });

    const message = "We have sent an verification email to " + email;
    /**
     * below function `checkUserPasswordForgetLink` stores users `uid` into server store.
     * just to verify that only this user has requested for the email verification and this request is not from any anonymous user.
     */
    checkUserPasswordForgetLink({
      storage: serverStorage,
      uniqueId: `verify${uid}`,
    });

    // after `uid` of user is stored into server storage
    // it will send an email with verification link
    /**
     * below function sends email to the given email address.
     * below function `sendMail` accepyts 6 argumnets
     * 1. reuest (from express)
     * 2. response (from express)
     * 3. next (from express)
     * 4. email template which will be sent on email.
     * 5. subject of email
     * 6. message sent in the api response.
     */

    setTimeout(() => {
      const response = checkUserPasswordForgetLink({
        storage: serverStorage,
        uniqueId: `verify${uid}`,
        action: "delete",
      });
    }, VERIFICATION_LINK_EXPIRY);
    sendMail(req, res, next, template, "Account Verification", message);
  } catch (error) {
    internalError(res, error.message);
  }
};

exports.verifyUserWithEmail = async (req, res, next, serverStorage, db) => {
  try {
    const { id } = req.query;
    const User = db.user;

    if (serverStorage.has(`fverify${id}p`)) {
      const isUserExists = await User.findOne({ where: { uid: id } });

      if (isUserExists?.dataValues?.uid == id) {
        if (isUserExists?.dataValues?.isVerified) {
          res.render("verified.html");
        } else {
          const isUpdated = await User.update(
            { isVerified: true },
            { where: { uid: id } }
          );

          if (isUpdated) {
            res.render("success.html");
          } else {
            internalError(res);
          }
        }
      } else {
        res.render("error.html");
      }
      //   serverStorage.delete(`fverify${uniqueId}p`);
    } else {
      res.render("error.html");
    }
  } catch (error) {
    res.render("error.html");
  }
};

exports.forgotPassword = async (req, res, next, serverStorage, db) => {
  try {
    // get email from api request body
    const { email } = req.body;
    const User = db.user;

    const isUserExists = await User.findOne({ where: { email } });

    if (isUserExists == null || !isUserExists) {
      return notFound(res, "User with email does not exists.");
    }

    const template = require("../view/email-templates/forgotPassword")({
      email,
      id: isUserExists?.dataValues?.uid,
    });

    const message =
      "We have sent an link to reset your password to email" + email;
    checkUserPasswordForgetLink({
      storage: serverStorage,
      uniqueId: isUserExists?.dataValues?.uid,
    });
    setTimeout(() => {
      checkUserPasswordForgetLink({
        storage: serverStorage,
        uniqueId: `${isUserExists?.dataValues?.uid}`,
        action: "delete",
      });
    }, VERIFICATION_LINK_EXPIRY);

    console.log("serverStorage: ", serverStorage);

    sendMail(req, res, next, template, "Forgot Password", message);
  } catch (error) {
    internalError(error);
  }
};

exports.changePasswordPage = async (req, res, next, serverStorage) => {
  try {
    const { id } = req.params;

    if (!serverStorage.has(`f${id}p`) || !id) {
      res.render("notfound.html");
      return;
    }

    res.render("forgot-password.html", { title: "Forgot Password" });
  } catch (error) {
    internalError(error);
  }
};

exports.updatePassword = async function (req, res, next, serverStorage, db) {
  const { id, password } = req.body;
  const User = db.user;
  if (!password) {
    return badRequest(res, "Password casn not be empty.");
  }

  const validatePassword =
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;

  if (!validatePassword.test(password)) {
    Success(res, {
      message: `Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character, and be at least 8 characters long.`,
      statuscode: 0,
    });
    return;
  }
  if (!id) {
    return badRequest(res, "Missing user id.");
  }

  if (serverStorage.has(`f${id}p`)) {
    const isUserExists = await User.findOne({ where: { uid: id } });
    if (!isUserExists) {
      return badRequest(res, "User not found.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const response = await User.update(
      { password: hashedPassword },
      { where: { uid: id } }
    );
    if (response) {
      serverStorage.delete(`f${id}p`);
      return Success(res, { message: "Password updated successfully." });
    } else {
      internalError(res, "Failed to update password.");
    }
  } else {
    return badRequest(res, "Invalid password reset link.");
  }
};
