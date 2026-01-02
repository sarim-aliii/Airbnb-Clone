const User = require("../models/user.js");
const Booking = require("../models/booking");
const Listing = require("../models/listing");


module.exports.signup = async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);

        // Login after Signup
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to WanderLust");
            res.redirect("/listings");
        });
    }
    catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
}


module.exports.login = async (req, res) => {
    req.flash("success", "Welcome to WanderLust!!!");

    if (res.locals.redirectUrl) {
        res.redirect(res.locals.redirectUrl);
    }
    else {
        res.redirect("/listings");
    }
}


module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if(err){
            return next(err);
        }
        req.flash("success", "Logged out");
        res.redirect("/listings");
    }); 
}

// New Method for Dashboard
module.exports.renderTrips = async (req, res) => {
    const bookings = await Booking.find({ author: req.user._id }).populate("listing");
    res.render("users/trips.ejs", { bookings });
}


module.exports.renderHostBookings = async (req, res) => {
    // 1. Find all listings owned by the current user
    const listings = await Listing.find({ owner: req.user._id });
    
    // 2. Find all bookings that are for ANY of those listings
    const bookings = await Booking.find({ listing: { $in: listings } })
        .populate("listing")
        .populate("author") // Populate guest details
        .sort({ createdAt: -1 }); // Show newest bookings first

    res.render("users/manage.ejs", { bookings });
};