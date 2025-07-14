const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('../database/init');

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://kripapickles.shop/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    const { rows } = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [profile.id, profile.emails[0].value]);
    let user = rows[0];
    if (user) {
      // Update Google ID if not set
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
        user.google_id = profile.id;
      }
      return done(null, user);
    }
    // Create new user
    const result = await pool.query(
      'INSERT INTO users (username, email, google_id, role, verified) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [profile.displayName, profile.emails[0].value, profile.id, 'user', true]
    );
    return done(null, result.rows[0]);
  } catch (error) {
    return done(error);
  }
}));

module.exports = passport; 