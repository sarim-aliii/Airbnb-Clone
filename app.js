if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const port = 8080;
const path = require('path');
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("./models/user.js");

// --- SECURITY IMPORTS ---
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

const http = require('http');
const { Server } = require("socket.io");
const Chat = require("./models/chat.js"); 
const Notification = require("./models/notification.js");
const nodemailer = require('nodemailer');

const server = http.createServer(app);
const io = new Server(server);

// Express Router
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRouter = require("./routes/booking.js");
const adminRouter = require("./routes/admin.js");

const dbUrl = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);
}

main()
    .then(() => console.log("Connection successful"))
    .catch(err => console.error(err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body Parsers & Static Files
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// --- SECURITY MIDDLEWARE CONFIGURATION ---

// 1. NoSQL Injection Prevention
app.use(mongoSanitize());

// 2. XSS Protection
app.use(xss());

// 3. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, 
    legacyHeaders: false, 
    message: "Too many requests from this IP, please try again after 15 minutes."
});
app.use(limiter);

// 4. Secure Headers (Helmet) with Content Security Policy (CSP)
const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/", // Matches Cloudinary
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

// --- SESSION & AUTHENTICATION ---

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE!");
})

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    }
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                return done(null, user);
            }
            else {
                const newUser = new User({
                    email: profile.emails[0].value,
                    username: profile.emails[0].value,
                    googleId: profile.id,
                    isVerified: true
                });

                await newUser.save();
                return done(null, newUser);
            }
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global Variables Middleware
app.use(async (req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;

    if (req.user) {
        const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
        res.locals.unreadCount = unreadCount;
    } else {
        res.locals.unreadCount = 0;
    }
    
    next();
});

// --- ROUTES ---

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/listings/:id/bookings", bookingRouter);
app.use("/", userRouter);
app.use("/admin", adminRouter);


app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

// Custom Error Handling
app.use((err, req, res, next) => {
    let { status = 500, message = "Something went wrong!" } = err;
    res.status(status).render("error.ejs", { message })
});

// --- NOTIFICATION & SOCKET.IO LOGIC ---

const sendEmailNotification = async (receiverEmail, senderName, message) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });

    const mailOptions = {
        to: receiverEmail,
        subject: `New Message from ${senderName}`,
        html: `<p>You have a new message from <b>${senderName}</b>:</p>
               <p>"${message}"</p>
               <a href="${process.env.BASE_URL || 'http://localhost:8080'}/inbox">Reply Now</a>`
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error("Email notification failed:", err);
    }
};

io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("join_room", async ({ senderId, receiverId }) => {
        const room = [senderId, receiverId].sort().join("_");
        socket.join(room);
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
        const { senderId, receiverId, message } = data;
        const room = [senderId, receiverId].sort().join("_");

        // 1. Save Message
        const newChat = new Chat({ sender: senderId, receiver: receiverId, message });
        await newChat.save();

        // 2. Create In-App Notification
        const newNotif = new Notification({
            user: receiverId,
            type: 'message',
            message: `New message: ${message.substring(0, 20)}...`,
            relatedId: newChat._id
        });
        await newNotif.save();

        // 3. Emit to Room
        io.to(room).emit("receive_message", data);

        // 4. Send Email Notification (Async)
        const receiver = await User.findById(receiverId);
        const sender = await User.findById(senderId);
        
        if(receiver && sender) {
            sendEmailNotification(receiver.email, sender.username, message);
        }
    });
});

server.listen(port, (req, res) => {
    console.log(`Server is running on port ${port}`);
});