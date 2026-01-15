const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/booking");

module.exports.dashboard = async (req, res) => {
    // 1. Fetch Stats
    const totalUsers = await User.countDocuments();
    const totalListings = await Listing.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // 2. Calculate Total Revenue (Sum of all 'booked' status bookings)
    const revenueData = await Booking.aggregate([
        { $match: { status: 'booked' } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // 3. Fetch Recent Data for tables
    const recentUsers = await User.find().sort({_id: -1}).limit(5);
    const recentListings = await Listing.find().populate('owner').sort({_id: -1}).limit(5);

    res.render("admin/dashboard.ejs", { 
        totalUsers, 
        totalListings, 
        totalBookings, 
        totalRevenue,
        recentUsers,
        recentListings
    });
};

module.exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    req.flash("success", "User deleted successfully");
    res.redirect("/admin/dashboard");
};

module.exports.deleteListing = async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted by Admin");
    res.redirect("/admin/dashboard");
};