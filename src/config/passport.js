const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { sql, connectDB } = require("../config/db/db");

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/accounts/google/callback", // 👈 theo yêu cầu của bạn
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const pool = await connectDB();

        // Kiểm tra user đã tồn tại chưa
        const email = profile.emails[0].value;
        const check = await pool
          .request()
          .input("username", sql.NVarChar, email)
          .query("SELECT * FROM users WHERE username = @username");

        let user;
        if (check.recordset.length === 0) {
          // Nếu chưa có -> tạo user mới
          await pool
            .request()
            .input("username", sql.NVarChar, email)
            .input("password", sql.NVarChar, "")
            .input("role", sql.NVarChar, "user")
            .query(
              "INSERT INTO users (username, password, role) VALUES (@username, @password, @role)"
            );

          const newUser = await pool
            .request()
            .input("username", sql.NVarChar, email)
            .query("SELECT * FROM users WHERE username = @username");

          user = newUser.recordset[0];
        } else {
          user = check.recordset[0];
        }

        done(null, user);
      } catch (err) {
        console.error("Lỗi xác thực Google:", err);
        done(err, null);
      }
    }
  )
);

// Lưu user vào session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM users WHERE id = @id");
    done(null, result.recordset[0]);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
