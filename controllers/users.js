const User = require("../models/user.js");


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

    // dont work as soon as user logged in express will clear out session information
    // res.redirect(req.session.redirectUrl);   

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