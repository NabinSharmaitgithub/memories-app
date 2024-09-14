const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');  // Assuming you're using passport for GitHub OAuth
const GitHubStrategy = require('passport-github').Strategy;
const upload = multer();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));  // Serve static files like HTML, CSS, JS

// GitHub OAuth Setup (replace with your actual GitHub client ID and secret)
passport.use(new GitHubStrategy({
  clientID: 'your-client-id',
  clientSecret: 'your-client-secret',
  callbackURL: 'http://localhost:3000/auth/github/callback'
}, (accessToken, refreshToken, profile, done) => {
  profile.accessToken = accessToken;  // Store the access token
  return done(null, profile);
}));

// Session and Passport initialization
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Routes
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => res.redirect('/upload')
);

app.get('/upload', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.sendFile(__dirname + '/public/upload.html');
});

app.post('/upload-photos', upload.array('photos'), (req, res) => {
  const token = req.user.accessToken;
  const photos = req.files;

  if (!photos || photos.length === 0) {
    return res.status(400).send('No photos uploaded');
  }

  const uploadPromises = photos.map((photo) => {
    return axios.put(`https://api.github.com/repos/${req.user.username}/memories/contents/${photo.originalname}`, {
      message: `Add photo ${photo.originalname}`,
      content: photo.buffer.toString('base64'),
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  });

  Promise.all(uploadPromises)
    .then(() => res.send('Photos uploaded successfully'))
    .catch((err) => res.status(500).send(err.message));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
        
