const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");



const userSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    image: {
        url: {
            type: String,
            default: "https://images.unsplash.com/photo-1575936123452-b67c3203c357?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW1hZ2V8ZW58MHx8MHx8fDA%3D&w=1000&q=80"
        },
        filename: String,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    wishlist: [
        {
            type: Schema.Types.ObjectId,
            ref: "Listing"
        }
    ],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
module.exports = User;