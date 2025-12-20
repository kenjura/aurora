require('dotenv').config({path: process.env.DOTENVFILE || '/etc/aurora.env'});

if (!process.env.WIKIROOT) {
  console.error('WIKIROOT is not set. Please set it in your environment or in the .env file.');
  process.exit(1);
}

const autoIndex = require('./helpers/autoIndex');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const debug = require('debug')('aurora:main');
const fs = require('fs');
const htmlEngine = require('./helpers/htmlEngine');
const model = require('./model/model');
const morgan = require('morgan');
const noBots = require('express-nobots');
const path = require('path');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

const { getArticleList } = require('./helpers/getFilesRecursively');

debug('aurora is starting...');

const port = process.env.PORT || 3004;

const app = express();

app.set('views', path.join(__dirname, 'views'));
htmlEngine(app);

// Middleware
app.use(morgan('combined'));
app.use(noBots({ block: false }));
app.all('*', (req, res, next) => {
  if (req.isBot) {
    debug('bot detected');
    return res.status(200).send('...');
  }
  next();
});
app.use(cookieParser());
app.use(bodyParser.text());
app.use(session({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Routes

app.get('/favicon.*', (req, res) => res.send(null));

app.use('/static', express.static(path.join(__dirname, 'static')));

// Search endpoints
app.get('/:db/search/:query', async (req, res) => {
  debug('deprecated search endpoint /:db/search/:query used');
  const basepath = path.join(process.env.WIKIROOT, `/${req.params.db}`);
  const allFiles = await getArticleList(basepath);
  const matches = allFiles.filter(file => file.match(req.params.query));
  res.status(200).send(matches);
});

app.get(/\/search\/(.*)/, async (req, res) => {
  const fullQuery = req.params[0];
  const articleName = fullQuery.substr(fullQuery.lastIndexOf('/') + 1);
  const basepath = path.join(process.env.WIKIROOT);
  const allFiles = await getArticleList(basepath);
  const goodMatches = allFiles.filter(file => file.match(fullQuery));
  const okMatches = allFiles.filter(file => file.match(articleName));
  res.status(200).send({ basepath, goodMatches, okMatches, fullQuery, articleName });
});

// Home route
app.get('/', (req, res) => {
  const basepath = process.env.WIKIROOT;
  const allFiles = autoIndex.get(basepath);
  const scope = {
    content: { final: allFiles.map(file => `<li><a href="${file.link}">${file.name}</a></li>`).join('') },
  };
  res.render('view', scope);
});

// Rate limiting
app.enable('trust proxy');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/:db/:article', apiLimiter);

// Serve binary files from WIKIROOT
const WIKIROOT_STATIC_EXTENSIONS = ['woff', 'woff2', 'png', 'jpg', 'json'];

let fileTypeFromFile;
(async () => {
  const fileType = await import('file-type');
  fileTypeFromFile = fileType.fileTypeFromFile;
})();

const { isBinaryFile } = require('isbinaryfile');
const { readFile, lstat } = require('fs').promises;

app.get('*', async (req, res, next) => {
  if (req.isBot) {
    debug('bot attempting to access content');
    return res.status(200).send('nope');
  }

  const fullpath = path.join(process.env.WIKIROOT, unescape(req.path));
  const extension = fullpath.substr(fullpath.lastIndexOf('.') + 1);
  const isTextButServeAsStatic = ['json'].includes(extension);

  if (!fs.existsSync(fullpath)) return next();

  try {
    const data = await readFile(fullpath);
    const stat = await lstat(fullpath);
    const isBinary = await isBinaryFile(data, stat.size);
    
    if (!isBinary) {
      if (isTextButServeAsStatic) {
        if (path.extname(fullpath) === '.json') {
          res.header('Content-Type', 'application/json');
        }
        return res.status(200).send(data);
      }
      return next();
    }
  } catch (err) {
    debug('error processing file, skipping: %s', err.message);
    return next();
  }

  debug('serving static file from WIKIROOT: %s', fullpath);
  const { ext } = await fileTypeFromFile(fullpath);
  
  if (!WIKIROOT_STATIC_EXTENSIONS.includes(ext)) {
    debug('file type %s not in allowed list, skipping', ext);
    return next();
  }

  const filecontents = fs.readFileSync(fullpath);
  const contentTypes = {
    woff: 'application/font-woff',
    woff2: 'font/woff2',
    png: 'image/png',
    jpg: 'image/jpeg',
    json: 'application/json'
  };
  
  if (contentTypes[extension]) {
    res.header('Content-Type', contentTypes[extension]);
  }
  res.status(200).send(filecontents);
});


// Article routes
app.get('*', (req, res) => {
  let pathname = req.path;

  const options = {};
  if (pathname.match(/\/all$/)) {
    options.index = true;
    pathname = pathname.replace(/\/all$/, '');
  }

  if (pathname.match(/(\.jpg|\.png)/)) {
    return express.static(path.join(process.env.WIKIROOT))(req, res, () => {});
  }

  const fullpath = path.join(process.env.WIKIROOT, unescape(req.path));
  let exists = false;
  let isDir = false;
  
  try {
    const stats = fs.lstatSync(fullpath);
    exists = true;
    isDir = stats.isDirectory();
  } catch (e) {
    exists = false;
  }

  const dirname = path.dirname(fullpath);
  const allFiles = autoIndex.get(dirname);
  const index = allFiles
    .map(file => `<li><a href="${file.link}">${file.name}</a></li>`)
    .join('');
  
  debug('rendering article: %s (exists: %s, isDir: %s)', fullpath, exists, isDir);

  const data = model.build(pathname, options);
  if (!data) return res.render('no_article');
  if (data === 404) return res.render('404');
  
  const obj = Object.assign({ index, isDir }, data);
  if (typeof req.query.raw !== 'undefined') return res.send(obj.content.raw);
  res.render('view', obj);
});

// Preload article list
model.getAllFilesInWikiroot();

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(500).send('It is pitch black. You are likely to be eaten by a grue.');
});

app.listen(port, () => {
  debug('aurora is online');
  console.log(`Aurora is running on port ${port}`);
});