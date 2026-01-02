const express = require("express")
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn, isOwner, validateListing} = require("../middleware.js");
const listingController = require("../controllers/listings.js");



// For handling : multipart/form-data
const multer = require("multer");
const {storage} = require("../cloudConfig.js");
const upload = multer({ storage });




router.route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn, 
        upload.array('listing[image]', 5),
        validateListing, 
        wrapAsync(listingController.create));

router.get("/new", isLoggedIn, listingController.new);

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

router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.edit));


module.exports = router;