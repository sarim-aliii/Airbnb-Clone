const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const bookingController = require("../controllers/booking.js");



router.post("/", isLoggedIn, wrapAsync(bookingController.createBooking));

router.post("/block", isLoggedIn, wrapAsync(bookingController.createBlock));

router.delete("/:bookingId", isLoggedIn, wrapAsync(bookingController.cancelBooking));

module.exports = router;