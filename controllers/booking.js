const Booking = require("../models/booking");
const Listing = require("../models/listing");

// Initialize Stripe safely (Prevents crashes if key is missing)
let stripe;
try {
    const Stripe = require('stripe');
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
} catch (e) {
    console.log("Stripe not initialized. Ensure STRIPE_SECRET_KEY is in .env");
}

// TOGGLE TEST MODE
const IS_TEST_MODE = true; 

module.exports.createBlock = async (req, res) => {
    let { id } = req.params;
    const { checkIn, checkOut } = req.body;
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (start >= end) {
        req.flash("error", "End date must be after start date!");
        return res.redirect(`/manage/calendar?listingId=${id}`);
    }

    const existingBooking = await Booking.findOne({
        listing: id,
        $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }]
    });

    if (existingBooking) {
        req.flash("error", "Dates already blocked/booked!");
        return res.redirect(`/manage/calendar?listingId=${id}`);
    }

    const newBlock = new Booking({
        listing: id,
        author: req.user._id,
        checkIn: start,
        checkOut: end,
        totalPrice: 0,
        status: 'blocked',
        paymentId: 'blocked_by_host'
    });

    await newBlock.save();
    req.flash("success", "Dates blocked.");
    return res.redirect(`/manage/calendar?listingId=${id}`);
};

module.exports.createCheckoutSession = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    const { checkIn, checkOut } = req.body.booking;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // 1. Validate Dates
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays <= 0) {
        req.flash("error", "Check-out date must be after check-in date!");
        return res.redirect(`/listings/${id}`); 
    }

    // 2. Check Availability
    const existingBooking = await Booking.findOne({
        listing: id,
        $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }]
    });

    if (existingBooking) {
        req.flash("error", "These dates are already booked! Please choose another date.");
        return res.redirect(`/listings/${id}`);
    }

    const totalPrice = diffDays * listing.price;

    // --- BYPASS LOGIC (TEST MODE) ---
    if (IS_TEST_MODE) {
        const params = new URLSearchParams({
            mock_payment: "true",
            listingId: id,
            userId: req.user._id.toString(),
            checkIn: checkIn,
            checkOut: checkOut,
            totalPrice: totalPrice
        });

        return res.redirect(`${req.protocol}://${req.get('host')}/listings/${id}/bookings/success?${params.toString()}`);
    }
    // --------------------------------

    // 3. Real Stripe Logic
    if (!stripe) {
        req.flash("error", "Stripe is not configured.");
        return res.redirect(`/listings/${id}`);
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'inr', 
                product_data: {
                    name: `${listing.title} (${diffDays} nights)`,
                    images: [listing.image.url],
                },
                unit_amount: listing.price * 100,
            },
            quantity: diffDays,
        }],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/listings/${id}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/listings/${id}`,
        metadata: {
            listingId: id,
            userId: req.user._id.toString(),
            checkIn: checkIn,
            checkOut: checkOut,
            totalPrice: totalPrice.toString()
        }
    });

    return res.redirect(303, session.url);
};

module.exports.bookingSuccess = async (req, res) => {
    // 1. Handle Mock Payment
    if (req.query.mock_payment === "true" && IS_TEST_MODE) {
        const { listingId, userId, checkIn, checkOut, totalPrice } = req.query;
        
        const newBooking = new Booking({
            listing: listingId,
            author: userId,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            totalPrice: Number(totalPrice),
            paymentId: "TEST_PAYMENT_ID_" + Date.now(),
            status: 'booked'
        });

        await newBooking.save();
        req.flash("success", "TEST MODE: Booking confirmed!");
        return res.redirect(`/trips`); 
    }

    // 2. Handle Real Payment
    const { session_id } = req.query;
    if(!session_id) {
        req.flash("error", "Invalid session.");
        return res.redirect("/listings"); 
    }

    if (!stripe) {
        req.flash("error", "Stripe error.");
        return res.redirect("/listings");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
        const { listingId, userId, checkIn, checkOut, totalPrice } = session.metadata;

        const newBooking = new Booking({
            listing: listingId,
            author: userId,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            totalPrice: Number(totalPrice),
            paymentId: session.payment_intent, 
            status: 'booked'
        });

        await newBooking.save();
        req.flash("success", "Payment successful! Booking confirmed.");
        return res.redirect(`/trips`);
    } else {
        req.flash("error", "Payment failed or was cancelled.");
        return res.redirect(`/listings`); 
    }
};

module.exports.cancelBooking = async (req, res) => {
    let { id, bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId);

    if (!booking.author.equals(req.user._id)) {
        req.flash("error", "You do not have permission to cancel this booking.");
        return res.redirect("/trips"); 
    }

    await Booking.findByIdAndUpdate(bookingId, { status: "cancelled" });

    req.flash("success", "Booking cancelled successfully.");
    return res.redirect("/trips");
};