const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const bookingController = require("../controllers/booking.js");

// Route to initiate payment
router.post("/", isLoggedIn, wrapAsync(bookingController.createCheckoutSession));

// Route for success callback
router.get("/success", isLoggedIn, wrapAsync(bookingController.bookingSuccess));

// Host blocking dates
router.post("/block", isLoggedIn, wrapAsync(bookingController.createBlock));

// Cancel booking
router.delete("/:bookingId", isLoggedIn, wrapAsync(bookingController.cancelBooking));

module.exports = router;