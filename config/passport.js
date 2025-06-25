const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = function (passport) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: '/api/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                const newUserInfo = {
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    isVerified: true, // Google users are verified by default
                    profileImage: profile.photos ? profile.photos[0].value : null
                };

                try {
                    let user = await User.findOne({ googleId: profile.id });
                    let isNewUser = false;

                    if (user) {
                        // User found with this Google ID. Not new.
                    } else {
                        // No user with this Google ID. Check by email.
                        user = await User.findOne({ email: newUserInfo.email });
                        if (user) {
                            // Found user by email. Link account. Not new.
                            user.googleId = newUserInfo.googleId;
                            user.isVerified = true;
                            await user.save();
                        } else {
                            // No user found at all. Create one. This one is new.
                            user = await User.create(newUserInfo);
                            isNewUser = true;
                        }
                    }

                    // Convert Mongoose doc to plain object and attach the isNewUser flag
                    const userPayload = user.toObject();
                    userPayload.isNewUser = isNewUser;

                    return done(null, userPayload);
                } catch (err) {
                    console.error(err);
                    return done(err, null);
                }
            }
        )
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};
