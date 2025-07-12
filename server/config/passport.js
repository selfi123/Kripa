const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { db } = require('../database/init');

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api/auth/google/callback' : 'https://kripapickles.shop/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', 
      [profile.id, profile.emails[0].value], async (err, existingUser) => {
      if (err) {
        return done(err);
      }

      if (existingUser) {
        // Update Google ID if not set
        if (!existingUser.google_id) {
          db.run('UPDATE users SET google_id = ? WHERE id = ?', 
            [profile.id, existingUser.id]);
        }
        return done(null, existingUser);
      }

      // Create new user
      const newUser = {
        username: profile.displayName,
        email: profile.emails[0].value,
        google_id: profile.id,
        role: 'user'
      };

      db.run('INSERT INTO users (username, email, google_id, role) VALUES (?, ?, ?, ?)',
        [newUser.username, newUser.email, newUser.google_id, newUser.role], function(err) {
        if (err) {
          return done(err);
        }
        newUser.id = this.lastID;
        return done(null, newUser);
      });
    });
  } catch (error) {
    return done(error);
  }
}));

module.exports = passport; 