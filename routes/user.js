const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl, isLoggedIn } = require("../middleware.js");
const userController = require("../controllers/users.js");


// Image Upload Setup
const multer = require('multer');
const { storage } = require('../cloudConfig.js');
const upload = multer({ storage });


// Sign up
router.route("/signup")
    .get((req, res) => res.render("users/signup.ejs"))
    .post(wrapAsync(userController.signup));
    
// Verification Route
router.get("/verify/:token", wrapAsync(userController.verifyEmail));


router.get("/login", (req, res) => {
    res.render("users/login.ejs");
});


// Log in
router.post("/login", saveRedirectUrl, async (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
        if (err) return next(err);
        
        if (!user) {
            req.flash("error", "Invalid username or password.");
            return res.redirect("/login");
        }

        // BLOCK LOGIN IF NOT VERIFIED
        if (!user.isVerified) {
            req.flash("error", "Your account is not verified. Please check your email.");
            return res.redirect("/login");
        }

        // If verified, Log In
        req.logIn(user, (err) => {
            if (err) return next(err);
            req.flash("success", "Welcome back!");
            let redirectUrl = res.locals.redirectUrl || "/listings";
            res.redirect(redirectUrl);
        });
    })(req, res, next);
});


// Log Out
router.get("/logout", userController.logout);


// FORGOT PASSWORD ROUTES
router.get("/forgot-password", userController.renderForgotPassword);
router.post("/forgot-password", wrapAsync(userController.sendResetEmail));

// RESET PASSWORD ROUTES
router.get("/reset/:token", wrapAsync(userController.renderResetPassword));
router.post("/reset/:token", wrapAsync(userController.resetPassword));


// Google Auth
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    failureFlash: true
  }),
  (req, res) => {
    req.flash("success", "Welcome back!");
    res.redirect("/listings");
  }
);

// My Trips Route
router.get("/trips", isLoggedIn, wrapAsync(userController.renderTrips));

// Host Dashboard Route
router.get("/manage", isLoggedIn, wrapAsync(userController.renderHostBookings));

// --- WISHLIST ROUTES (Fixed Order) ---

// 1. GET /wishlist (Show page) - Put this FIRST
router.get("/wishlist", isLoggedIn, wrapAsync(userController.renderWishlist));

// 2. POST /wishlist/:id (Add/Remove)
router.post("/wishlist/:id", isLoggedIn, wrapAsync(userController.toggleWishlist));


// 1. GET Profile Page
router.get("/profile", isLoggedIn, wrapAsync(userController.renderProfile));

// 2. PUT Update Profile (with image upload)
router.put("/profile",
  isLoggedIn,
  upload.single('user[image]'), // Handle single image upload
  wrapAsync(userController.updateProfile)
);


module.exports = router;