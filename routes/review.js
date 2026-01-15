const express = require("express")
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { validateReview, isLoggedIn, isAuthor } = require("../middleware.js");
const reviewController = require("../controllers/reviews.js")


const multer = require('multer');
const { storage } = require('../cloudConfig.js');
const upload = multer({ storage });


// Post Route
router.post("/", 
    isLoggedIn, 
    upload.single('review[image]'),
    validateReview, 
    wrapAsync(reviewController.post)
);


// Delete review
router.delete("/:reviewId", isLoggedIn, isAuthor, wrapAsync(reviewController.delete));


module.exports = router;