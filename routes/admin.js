const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isAdmin } = require("../middleware.js");
const adminController = require("../controllers/admin.js");

// Protect all admin routes
router.use(isLoggedIn, isAdmin);

// Dashboard
router.get("/dashboard", wrapAsync(adminController.dashboard));

// User Management
router.delete("/users/:id", wrapAsync(adminController.deleteUser));

// Listing Management (Admin Override)
router.delete("/listings/:id", wrapAsync(adminController.deleteListing));

module.exports = router;