const Listing = require("../models/listing");
const Booking = require("../models/booking");

// Map Services
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
    // 1. Destructure all filter parameters from the URL
    let { search, category, min_price, max_price, guests, amenities } = req.query;
    let query = {};

    // 2. Search Filter (Title, Location, Country)
    if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
            { title: regex }, 
            { location: regex }, 
            { country: regex } 
        ];
    }

    // 3. Category Filter
    if (category && category !== "undefined") {
        query.category = category;
    }

    // 4. Price Range Filter
    if (min_price || max_price) {
        query.price = {};
        if (min_price) query.price.$gte = Number(min_price);
        if (max_price) query.price.$lte = Number(max_price);
    }

    // 5. Guest Capacity Filter
    if (guests) {
        query.guestCapacity = { $gte: Number(guests) };
    }

    // 6. Amenities Filter
    if (amenities) {
        const amenitiesList = Array.isArray(amenities) ? amenities : [amenities];
        query.amenities = { $all: amenitiesList };
    }

    // 7. Fetch Listings
    const allListings = await Listing.find(query);

    // 8. Prepare data to send back to View
    let amenitiesForView = [];
    if (amenities) {
        amenitiesForView = Array.isArray(amenities) ? amenities : [amenities];
    }

    res.render("listings/index.ejs", { 
        allListings, 
        values: { search, category, min_price, max_price, guests, amenities: amenitiesForView } 
    });
}

module.exports.new = (req, res) => {
    res.render("listings/new.ejs");
}

module.exports.show = async (req, res) => {
    let { id } = req.params;
    
    const listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings"); 
    }

    const bookings = await Booking.find({ listing: id });
    res.render("listings/show.ejs", { listing, bookings }); 
}

module.exports.create = async (req, res, next) => {
    let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1
    })
    .send();

    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };
    newListing.geometry = response.body.features[0].geometry;

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
}

module.exports.edit = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);

    // FIX: Add 'return' here as well
    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

    res.render("listings/edit.ejs", { listing, originalImageUrl });
}

module.exports.update = async (req, res) => {
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});

    if(typeof req.file !== 'undefined'){
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = {url, filename};
        await listing.save();
    }
    
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}

module.exports.delete = async (req, res) => {
    let {id} = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}