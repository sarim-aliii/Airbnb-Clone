const express = require("express")
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { validateReview, isLoggedIn, isAuthor } = require("../middleware.js");
const reviewController = require("../controllers/reviews.js")


// Post Route
router.post("/", validateReview, isLoggedIn, wrapAsync(reviewController.post));


// Delete review
router.delete("/:reviewId", isLoggedIn, isAuthor, wrapAsync(reviewController.delete));


module.exports = router;