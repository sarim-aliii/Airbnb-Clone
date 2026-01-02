const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl, isLoggedIn } = require("../middleware.js");
const userController = require("../controllers/users.js");


// Sign up
router.route("/signup")
    .get((req, res) => res.render("users/signup.ejs"))
    .post(wrapAsync(userController.signup));


// Log in
router.route("/login")
    .get((req, res) => res.render("users/login.ejs"))
    .post(saveRedirectUrl, passport.authenticate("local", {failureRedirect: "/login", failureFlash: true}), userController.login);


// Log Out
router.get("/logout", userController.logout);

// My Trips Route
router.get("/trips", isLoggedIn, wrapAsync(userController.renderTrips));


// Host Dashboard Route
router.get("/manage", isLoggedIn, wrapAsync(userController.renderHostBookings));

module.exports = router;