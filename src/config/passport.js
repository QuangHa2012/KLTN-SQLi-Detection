const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const bcrypt = require("bcrypt");
const { sql, connectDB } = require("../config/db/db");

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
        const pool = await connectDB();
        const email = profile.emails[0].value;
        const avatar = profile.photos[0].value;
        const provider = "google";

        //  Kiểm tra user theo email + provider (KHÔNG dùng username)
        const checkUser = await pool
          .request()
          .input("email", sql.NVarChar, email)
          .input("authProvider", sql.NVarChar, provider)
          .query("SELECT * FROM users WHERE email = @email AND authProvider = @authProvider");

        let user;

        if (checkUser.recordset.length === 0) {
          // 🔹 Tạo user mới
          const insertUser = await pool.request()
            .input("username", sql.NVarChar, profile.displayName)
            .input("email", sql.NVarChar, email)
            .input("password", sql.NVarChar, "") // không cần mật khẩu
            .input("role", sql.NVarChar, "user")
            .input("authProvider", sql.NVarChar, provider)
            .input("avatar", sql.NVarChar, avatar)
            .query(`
              INSERT INTO users (username, email, password, role, authProvider, avatar)
              OUTPUT INSERTED.*
              VALUES (@username, @email, @password, @role, @authProvider, @avatar)
            `);

          user = insertUser.recordset[0];
        } else {
          user = checkUser.recordset[0];
        }

        done(null, user);
      } catch (err) {
        console.error("❌ Google Auth Error:", err);
        done(err, null);
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
        const pool = await connectDB();
        const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`; // fallback nếu user không có email công khai
        const avatar = profile.photos?.[0]?.value || "";
        const provider = "facebook";

        const checkUser = await pool
          .request()
          .input("email", sql.NVarChar, email)
          .input("authProvider", sql.NVarChar, provider)
          .query("SELECT * FROM users WHERE email = @email AND authProvider = @authProvider");

        let user;
        if (checkUser.recordset.length === 0) {
          const insertUser = await pool.request()
            .input("username", sql.NVarChar, profile.displayName)
            .input("email", sql.NVarChar, email)
            .input("password", sql.NVarChar, "")
            .input("role", sql.NVarChar, "user")
            .input("authProvider", sql.NVarChar, provider)
            .input("avatar", sql.NVarChar, avatar)
            .query(`
              INSERT INTO users (username, email, password, role, authProvider, avatar)
              OUTPUT INSERTED.*
              VALUES (@username, @email, @password, @role, @authProvider, @avatar)
            `);

          user = insertUser.recordset[0];
        } else {
          user = checkUser.recordset[0];
        }

        done(null, user);
      } catch (err) {
        console.error("❌ Facebook Auth Error:", err);
        done(err, null);
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
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT id, username, email, role, avatar, authProvider FROM users WHERE id = @id");
    
    const user = result.recordset[0];
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
