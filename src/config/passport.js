const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const bcrypt = require("bcrypt");
const { sql, connectDB } = require("../config/db/db");
const userModel = require("../app/models/userModel");

// ================= GOOGLE STRATEGY =================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/accounts/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const avatar = profile.photos[0].value;
        const username = profile.displayName;
        const provider = 'google';

        let user = await userModel.findByEmailAndProvider(email, provider);
        if (!user) {
          user = await userModel.createSocialUser(username, email, avatar, provider);
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ Google Auth Error:", err);
        return done(err, null);
      }
    }
  )
);

// ================= FACEBOOK STRATEGY =================
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FB_CLIENT_ID,
      clientSecret: process.env.FB_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/accounts/facebook/callback",
      profileFields: ["id", "displayName", "emails", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;
        const avatar = profile.photos?.[0]?.value || '';
        const username = profile.displayName;
        const provider = 'facebook';

        let user = await userModel.findByEmailAndProvider(email, provider);
        if (!user) {
          user = await userModel.createSocialUser(username, email, avatar, provider);
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ Facebook Auth Error:", err);
        return done(err, null);
      }
    }
  )
);

// ================= SESSION SERIALIZATION =================
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
