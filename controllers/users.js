const User = require("../models/user.js");
const Booking = require("../models/booking");
const Listing = require("../models/listing");

const crypto = require('crypto');
const nodemailer = require('nodemailer');


module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ username, email });
        
        // 1. Generate Verification Token
        const token = crypto.randomBytes(32).toString('hex');
        newUser.verificationToken = token;
        newUser.isVerified = false; 

        // 2. Register User (Do NOT login yet)
        const registeredUser = await User.register(newUser, password);

        // 3. Send Verification Email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS
            }
        });

        const mailOptions = {
            to: email,
            from: 'WanderLust <no-reply@wanderlust.com>',
            subject: 'Please Verify Your Account',
            html: `
                <h3>Welcome to WanderLust!</h3>
                <p>Please verify your email to activate your account.</p>
                <a href="http://${req.headers.host}/verify/${token}">Click here to Verify</a>
                <br><br>
                <p>Or paste this link: http://${req.headers.host}/verify/${token}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        req.flash("success", "Registered! Please check your email to verify your account.");
        res.redirect("/login");
        
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
};


module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if(err){
            return next(err);
        }
        req.flash("success", "Logged out");
        res.redirect("/listings");
    }); 
}


module.exports.verifyEmail = async (req, res, next) => {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
        req.flash("error", "Invalid or expired verification link.");
        return res.redirect("/signup");
    }

    // Verify User
    user.isVerified = true;
    user.verificationToken = undefined; // Clear token
    await user.save();

    // Log them in automatically
    req.login(user, (err) => {
        if (err) return next(err);
        req.flash("success", "Email Verified! Welcome to WanderLust.");
        res.redirect("/listings");
    });
};


// 1. Render Forgot Password Form
module.exports.renderForgotPassword = (req, res) => {
    res.render("users/forgot-password.ejs");
};

// 2. Handle Forgot Password Submission (Send Email)
module.exports.sendResetEmail = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        req.flash("error", "No account with that email address exists.");
        return res.redirect("/forgot-password");
    }

    // Generate Token
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Configure Email Transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER, // Set these in your .env file
            pass: process.env.GMAIL_PASS  // Use App Password if 2FA is on
        }
    });

    const mailOptions = {
        to: user.email,
        from: 'WonderLust Support <no-reply@wonderlust.com>',
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
            `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
            `http://${req.headers.host}/reset/${token}\n\n` +
            `If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    await transporter.sendMail(mailOptions);
    req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions.");
    res.redirect("/login");
};

// 3. Render Reset Password Form (Verify Token)
module.exports.renderResetPassword = async (req, res) => {
    const { token } = req.params;
    const user = await User.findOne({ 
        resetPasswordToken: token, 
        resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot-password");
    }

    res.render("users/reset-password.ejs", { token });
};

// 4. Handle Reset Password Submission (Set New Password)
module.exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        req.flash("error", "Passwords do not match.");
        return res.redirect(`/reset/${token}`);
    }

    const user = await User.findOne({ 
        resetPasswordToken: token, 
        resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot-password");
    }

    // Set new password using passport-local-mongoose method
    await user.setPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Log the user in
    req.login(user, (err) => {
        if (err) return next(err);
        req.flash("success", "Success! Your password has been changed.");
        res.redirect("/listings");
    });
};


// New Method for Dashboard
module.exports.renderTrips = async (req, res) => {
    const bookings = await Booking.find({ author: req.user._id }).populate("listing");
    res.render("users/trips.ejs", { bookings });
}


module.exports.renderHostBookings = async (req, res) => {
    // 1. Find all listings owned by the current user
    const listings = await Listing.find({ owner: req.user._id });
    const listingIds = listings.map(l => l._id);
    
    // 2. Find all bookings for these listings
    const bookings = await Booking.find({ listing: { $in: listingIds } })
        .populate("listing")
        .populate("author")
        .sort({ checkIn: 1 }); // Sort by check-in date for the graph

    // --- DATA AGGREGATION FOR CHARTS ---

    // A. Calculate Monthly Earnings (Line Chart)
    // Format: { "Jan 2024": 15000, "Feb 2024": 20000 }
    const earningsData = {};
    
    bookings.forEach(booking => {
        // Create a key like "Jan 2024"
        const date = new Date(booking.checkIn);
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        if (!earningsData[monthYear]) {
            earningsData[monthYear] = 0;
        }
        earningsData[monthYear] += booking.totalPrice;
    });

    // B. Calculate Bookings Per Listing (Bar/Doughnut Chart)
    // Format: { "Villa by the Sea": 5, "Mountain Cabin": 3 }
    const listingStats = {};
    
    bookings.forEach(booking => {
        const title = booking.listing.title;
        if (!listingStats[title]) {
            listingStats[title] = 0;
        }
        listingStats[title] += 1;
    });

    // C. Calculate Key Metrics
    const totalEarnings = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalBookings = bookings.length;

    res.render("users/manage.ejs", { 
        bookings: bookings.reverse(), // Reverse back to show newest first in the table
        earningsData, 
        listingStats,
        totalEarnings,
        totalBookings
    });
};


module.exports.toggleWishlist = async (req, res) => {
    let { id } = req.params;
    let user = await User.findById(req.user._id);

    // Check if listingId is already in the wishlist
    if (user.wishlist.includes(id)) {
        // If yes, remove it
        await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: id } });
        req.flash("success", "Removed from wishlist!");
    } else {
        // If no, add it
        await User.findByIdAndUpdate(req.user._id, { $push: { wishlist: id } });
        req.flash("success", "Added to wishlist!");
    }
    
    // Redirect back to the same page
    res.redirect(req.get('referer') || "/listings");
};


module.exports.renderWishlist = async (req, res) => {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.render("users/wishlist.ejs", { listings: user.wishlist });
};


module.exports.renderProfile = (req, res) => {
    res.render("users/profile.ejs", { user: req.user });
};

module.exports.updateProfile = async (req, res) => {
    const { username, email } = req.body.user;
    const user = await User.findById(req.user._id);

    try {
        // 1. Update basic fields
        if(email) user.email = email;
        if(username && username !== user.username) {
            // Note: Updating username is tricky with Passport, we use a utility method if available or direct update
            user.username = username;
            await user.save(); // Save to check for duplicates first
        }

        // 2. Update Image if provided
        if (typeof req.file !== "undefined") {
            const url = req.file.path;
            const filename = req.file.filename;
            user.image = { url, filename };
        }

        await user.save();
        req.flash("success", "Profile updated successfully!");
        res.redirect("/profile");
        
    } catch (e) {
        req.flash("error", "Could not update profile: " + e.message);
        res.redirect("/profile");
    }
};