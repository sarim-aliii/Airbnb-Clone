const Booking = require("../models/booking");
const Listing = require("../models/listing");


module.exports.createBlock = async (req, res) => {
    let { id } = req.params; // listingId
    const { checkIn, checkOut } = req.body;

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (start >= end) {
        req.flash("error", "End date must be after start date!");
        return res.redirect(`/manage/calendar?listingId=${id}`);
    }

    // Check for Overlaps (Same logic as booking)
    const existingBooking = await Booking.findOne({
        listing: id,
        $or: [
            { checkIn: { $lt: end }, checkOut: { $gt: start } }
        ]
    });

    if (existingBooking) {
        req.flash("error", "These dates are already booked or blocked!");
        return res.redirect(`/manage/calendar?listingId=${id}`);
    }

    // Save as Blocked
    const newBlock = new Booking({
        listing: id,
        author: req.user._id,
        checkIn: start,
        checkOut: end,
        totalPrice: 0,
        status: 'blocked'
    });

    await newBlock.save();
    req.flash("success", "Dates blocked successfully.");
    res.redirect(`/manage/calendar?listingId=${id}`);
};


module.exports.createBooking = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    const { checkIn, checkOut } = req.body.booking;

    // 1. Convert strings to Date objects for comparison
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // 2. Calculate duration
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays <= 0) {
        req.flash("error", "Check-out date must be after check-in date!");
        return res.redirect(`/listings/${id}`);
    }

    const existingBooking = await Booking.findOne({
        listing: id,
        $or: [
            {
                checkIn: { $lt: end },
                checkOut: { $gt: start }
            }
        ]
    });

    if (existingBooking) {
        req.flash("error", "These dates are already booked! Please choose another date.");
        return res.redirect(`/listings/${id}`);
    }

    // 4. If no overlap, proceed to save
    const totalPrice = diffDays * listing.price;

    const newBooking = new Booking({
        listing: id,
        author: req.user._id,
        checkIn: start,
        checkOut: end,
        totalPrice: totalPrice
    });

    await newBooking.save();
    
    req.flash("success", `Booking confirmed! Total: ₹${totalPrice.toLocaleString("en-IN")}`);
    res.redirect(`/listings/${id}`);
};


module.exports.cancelBooking = async (req, res) => {
    let { id, bookingId } = req.params;
    
    // 1. Find the booking
    const booking = await Booking.findById(bookingId);

    // 2. Check if user is authorized (matches author)
    if (!booking.author.equals(req.user._id)) {
        req.flash("error", "You do not have permission to cancel this booking.");
        return res.redirect("/trips");
    }

    // 3. Update status to 'cancelled'
    await Booking.findByIdAndUpdate(bookingId, { status: "cancelled" });

    req.flash("success", "Booking cancelled successfully.");
    res.redirect("/trips");
};