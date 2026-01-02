const Booking = require("../models/booking");
const Listing = require("../models/listing");

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

    // 3. CHECK FOR OVERLAPPING BOOKINGS
    // Logic: A new booking overlaps if (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
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