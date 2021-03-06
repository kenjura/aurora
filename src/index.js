require('dotenv').config({path: '/etc/aurora.env'});

const autoIndex     = require('./helpers/autoIndex');
const express       = require('express');
const debug         = require('debug','aurora:main');
const fs            = require('fs');
const htmlEngine    = require('./helpers/htmlEngine');
const model         = require('./model/model');
const passport      = require('passport');
const path          = require('path');
const Strategy      = require('passport-facebook').Strategy;

const { getArticleList } = require('./helpers/getFilesRecursively');

debug('aurora is starting...');

const port = process.env.PORT || 3004;

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
    callbackURL: `http://localhost:${port}/login/facebook/return`
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
// app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').text());
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
app.use('/static', express.static(path.join(__dirname, 'static'))) // serve static files backed into aurora

// special endpoints
app.get('/:db/search/:query', async (req, res, next) => {
  console.warn('index > get /:db/search/:query > old search endpoint being used! this endpoint is deprecated in favor of /search/:query');
  const basepath = path.join(process.env.WIKIROOT, `/${req.params.db}`);
  const allFiles = await getArticleList(basepath);
  const matches = allFiles.filter( file => file.match(req.params.query) );
  res.status(200).send(matches);
});
app.get(/\/search\/(.*)/, async (req, res, next) => {
  const fullQuery = req.params[0];
  const articleName = fullQuery.substr(fullQuery.lastIndexOf('/')+1);
  const basepath = path.join(process.env.WIKIROOT);
  const allFiles = await getArticleList(basepath);
  const goodMatches = allFiles.filter( file => file.match(fullQuery) );
  const okMatches = allFiles.filter( file => file.match(articleName) );
  res.status(200).send({ basepath, goodMatches, okMatches, fullQuery, articleName });
  // res.status(200).send(matches);
});
app.get('/', (req, res, next) => {
  const basepath = process.env.WIKIROOT;
  const allFiles = autoIndex.get(basepath);
  const scope = {
    content: { final: allFiles.map(file => `<li><a href="${file.link}">${file.name}</a></li>`).join('') },
  }
  res.render('view', scope)
});

const rateLimit = require("express-rate-limit");
 
app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
 
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
 
// only apply to requests that begin with /api/
app.use("/:db/:article", apiLimiter);

// serve images and webfonts from wikiroot as static files (but not text files!)
const WIKIROOT_STATIC_FILE_EXTENSIONS = [ 'woff', 'woff2', 'png', 'jpg' ];

app.get('*', function (req, res, next) {
  const fullpath = path.join(process.env.WIKIROOT, unescape(req.path));
  const extension = fullpath.substr( fullpath.lastIndexOf('.')+1 );
  if (!WIKIROOT_STATIC_FILE_EXTENSIONS.includes(extension)) return next();
  if (!fs.existsSync(fullpath)) return next();

  // console.debug('getting static file from WIKIROOT.', { fullpath, extension });

  const filecontents = fs.readFileSync(fullpath);
  switch (extension) {
    case 'woff':
      res.header('Content-Type', 'application/font-woff');
      break;
    case 'woff2':
      res.header('Content-Type', 'font/woff2');
      break;
    case 'png':
      res.header("Content-Type", "image/png");
      break;
    case 'jpg':
      res.header("Content-Type", "image/jpeg");
      break;
    default:
  }
  res.status(200).send(filecontents);
});


// catch-all for frontend routes
app.get('*', function(req, res, next) {
  // endpoints other than view
  let mode = 'view', pathname = req.path;
  if (pathname.substr(-5)==='/edit') {
    mode = 'edit';
    pathname = pathname.substr(0, pathname.length-5);
  }

  // special pages
  const options = {};
  if (pathname.match(/\/all$/)) { options.index = true; pathname = pathname.replace(/\/all$/,''); }

  // image
  if (pathname.match(/(\.jpg|\.png)/)) return express.static(path.join(process.env.WIKIROOT))(req, res, next);

  // prepare autoIndex
  const fullpath = path.join(process.env.WIKIROOT, unescape(req.path));
  let stats, exists, isDir; // sigh
  try {
    stats = fs.lstatSync(fullpath);
    exists = true;
    isDir = stats.isDirectory();
  } catch(e) {
    exists = false;
  }

  // const dirname = isDir ? fullpath : path.dirname(fullpath);
  const dirname = path.dirname(fullpath);
  const allFiles = autoIndex.get(dirname);
  // const allFiles = fs.lstatSync(fullpath).isDirectory() ? autoIndex.get(fullpath) : [];
  const index = allFiles
    .map(file => `<li><a href="${file.link}">${file.name}</a></li>`)
    .join('');
  console.log({ fullpath, exists, isDir, dirname });

  // render article
  const data = model.build(pathname, options);
  if (!data) return res.render('no_article');
  if (data === 404) return res.render('404');
  if (data.newFile) return res.render('edit');  
  const breadcrumbs = '';//req.path.split('/').filter(a=>a&&a.length).map( a => `<a href="${req.path.substr(0,req.path.indexOf(a)+a.length)}">${a}</a>` ).join('&gt;');
  const user = req.user || { displayName:'not logged in'};
  const obj = Object.assign({ breadcrumbs, mode, user, index, isDir }, data);
  res.render(mode, obj);;
});

app.post('*', function(req, res, next) {
  try {
    const data = model.build(req.path);
    const filepath = data.filepath;
    fs.writeFileSync(filepath, req.body);
    res.status(200).send('The article was updated.');
  } catch(err) {
    console.error(err);
    res.status(500).send('An error occurred');
  }

});


// general error handler
app.use((err, req, res, next) => {
  console.error('GENERAL ERROR',err);
  res.status(500).send('It is pitch black. You are likely to be eaten by a grue.');
})

app.listen(port, err => {
  debug('aurora is online');
  console.log(`app is running on port ${port}`);
});

