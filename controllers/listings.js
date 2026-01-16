// controllers/listings.js
const Listing = require("../models/listing");
const Booking = require("../models/booking");

// Map Services
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
    let { search, category, min_price, max_price, guests, amenities, checkIn, checkOut, page } = req.query;
    let query = {};

    if (search) {
        query.$text = { $search: search };
    }

    if (category && category !== "undefined") {
        query.category = category;
    }

    if (min_price || max_price) {
        query.price = {};
        if (min_price) query.price.$gte = Number(min_price);
        if (max_price) query.price.$lte = Number(max_price);
    }

    if (guests) {
        query.guestCapacity = { $gte: Number(guests) };
    }

    if (amenities) {
        const amenitiesList = Array.isArray(amenities) ? amenities : [amenities];
        query.amenities = { $all: amenitiesList };
    }

    if (checkIn && checkOut) {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);

        const overlappingBookings = await Booking.find({
            checkIn: { $lt: endDate },
            checkOut: { $gt: startDate }
        }).select("listing");

        const unavailableListingIds = overlappingBookings.map(b => b.listing);

        if (unavailableListingIds.length > 0) {
            query._id = { $nin: unavailableListingIds };
        }
    }

    // Pagination Logic
    const pageNum = parseInt(page) || 1;
    const limit = 12;
    const skip = (pageNum - 1) * limit;

    const totalListings = await Listing.countDocuments(query);
    const totalPages = Math.ceil(totalListings / limit);

    // Fetch Listings
    let listingQuery = Listing.find(query);
    if (search) {
        listingQuery = listingQuery.sort({ score: { $meta: "textScore" } });
    }

    const allListings = await listingQuery.skip(skip).limit(limit);

    let amenitiesForView = [];
    if (amenities) {
        amenitiesForView = Array.isArray(amenities) ? amenities : [amenities];
    }

    res.render("listings/index.ejs", { 
        allListings, 
        values: { search, category, min_price, max_price, guests, amenities: amenitiesForView, checkIn, checkOut },
        currentPage: pageNum,
        totalPages
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

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.geometry = response.body.features[0].geometry;

    // Handle Multiple Images
    if (req.files) {
        newListing.image = req.files.map(f => ({ url: f.path, filename: f.filename }));
    }

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
}

module.exports.edit = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }

    // Removed the originalImageUrl logic as the view will now loop through the array
    res.render("listings/edit.ejs", { listing });
}

module.exports.update = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    // Handle Multiple Images Update (Replace existing)
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(f => ({ url: f.path, filename: f.filename }));
        listing.image = newImages; 
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