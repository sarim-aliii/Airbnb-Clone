const express = require("express")
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn, isOwner, validateListing} = require("../middleware.js");
const listingController = require("../controllers/listings.js");

// For handling : multipart/form-data
const multer = require("multer");
const {storage} = require("../cloudConfig.js");
const upload = multer({ storage });




// Index Route 
// router.get("/", wrapAsync(listingController.index));
// Create Route
// router.post("/", isLoggedIn, validateListing, wrapAsync(listingController.create));
router.route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn, 
        upload.single('listing[image]'),
        validateListing, 
        wrapAsync(listingController.create));



// New Route
router.get("/new", isLoggedIn, listingController.new);



// Show Route
// router.get("/:id", wrapAsync(listingController.show));
// Update Route
// router.put("/:id", validateListing, isLoggedIn, isOwner, wrapAsync(listingController.update));
// Delete Route
// router.delete("/:id", isLoggedIn, isOwner, wrapAsync(listingController.delete));
// Edit Route
// router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.edit));
router.route("/:id")
    .get(
        wrapAsync(listingController.show)
    )
    .put(
        isLoggedIn, 
        isOwner, 
        upload.single('listing[image]'),
        validateListing,
        wrapAsync(listingController.update)
    )
    .delete(
        isLoggedIn, 
        isOwner, 
        wrapAsync(listingController.delete)
    );



// Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.edit));


module.exports = router;