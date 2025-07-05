if(process.env.NODE_ENV != "production"){
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
const User = require("./models/user.js");



// Express Router
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");


const dbUrl = process.env.ATLASDB_URL;
async function main(){
    await mongoose.connect(dbUrl);
}
main()
.then(() => console.log("Connection successful"))
.catch(err => console.error(err));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);         // for styling 
app.use(express.static(path.join(__dirname, "/public")));      // to use static files from public folder


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
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        httpOnly: true,  // for security - Cross Scripting Attacks
    }
};

app.use(session(sessionOptions));
app.use(flash());


// Configuring Strategy
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})



app.use("/listings", listingRouter); // Restructuring listings
app.use("/listings/:id/reviews", reviewRouter); // Restructuring reviews
app.use("/", userRouter);



// *******************************
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});


// Custom Error Handling - Middleware
app.use((err, req, res, next) => {
    let {status=500, message="Something went wrong!"} = err;
    res.status(status).render("error.ejs", {message})
    // res.status(status).send(message);
});


app.listen(port, (req ,res) => {
    console.log(`Server is running on port ${port}`);
});