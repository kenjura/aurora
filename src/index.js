require('dotenv').config({path: '/etc/aurora.env'});

const express       = require('express');
const debug         = require('debug','aurora:main');
const htmlEngine    = require('./helpers/htmlEngine');
const model         = require('./model');
const passport      = require('passport');
const path          = require('path');
const Strategy      = require('passport-facebook').Strategy;

debug('aurora online');

// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new Strategy({
    clientID: process.env.FACEBOOK_APPID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: 'http://localhost:3003/login/facebook/return'
  },
  function(accessToken, refreshToken, profile, cb) {
    // In this example, the user's Facebook profile is supplied as the user
    // record.  In a production-quality application, the Facebook profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.
    return cb(null, profile);
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


// Create a new Express application.
var app = express();

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');
htmlEngine(app);

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// Define routes.

app.get('/favicon.*',(req,res) => res.send(null));

app.get('/login',
  function(req, res){
    res.render('login');
  });

app.get('/login/facebook',
  passport.authenticate('facebook'));

app.get('/login/facebook/return',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('profile', { user: req.user });
  });



// static files
app.use('/static', express.static(path.join(__dirname, 'static')))

// catch-all for frontend routes
app.get('*', function(req, res, next) {
  if (req.path.match(/(\.jpg|\.png)/)) return express.static(path.join(process.env.WIKIROOT))(req, res, next);
  const data = model.build(req.path);
  const breadcrumbs = '';//req.path.split('/').filter(a=>a&&a.length).map( a => `<a href="${req.path.substr(0,req.path.indexOf(a)+a.length)}">${a}</a>` ).join('&gt;');
  const obj = Object.assign({ breadcrumbs, user: req.user||{ displayName:'not logged in'} }, data);
  res.render('home', obj);;
});


// general error handler
app.use((err, req, res, next) => {
  console.error('GENERAL ERROR',err);
  res.status(500).send('It is pitch black. You are likely to be eaten by a grue.');
})

app.listen(3003,err => console.log('app is running on port 3003'));
