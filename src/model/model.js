const autoIndex = require('../helpers/autoIndex');
const debug    = require('debug')('aurora:model');
const fs       = require('fs');
const matchOne = require('../helpers/matchOne');
const markdown = require('markdown-it')();
const path     = require('path');
const WikiUtil = require('../helpers/WikiUtil');

module.exports.build = function(pathname, options={}) {
  // expects: current pathname (i.e. window.location.pathname e.g. /5e/Classes/Sorcerer )
  // returns: complete model with menu, content, style, etc

  // glossary:
  //  - pathname: the part of the URL after the domain, minus any query string
  //  - realpath: the full, absolute file system path of the pathname (if a match is found)
  //  - dirpath: the full, absolute file system path of the current working directory (base of realpath)
  //  - filepath: the full, absolute file system path of the current article
  //  - articleName: name of the current article, minus extension. If article is an index, this is instead of the name of the parent folder
  //  - articleExt: extension of the current article
  //  - db: the first chunk of the pathname (e.g. for /5e/Classes/Sorcerer, it's "5e". for /, it's null)

  // first things first. if no wikiroot, die immediateliy
  if (!process.env.WIKIROOT) return console.error('articleReader > ERROR > no WIKIROOT environment variable found.');
  if (!fs.existsSync(process.env.WIKIROOT)) return console.error(`articleReader > ERROR > WIKIROOT ${process.env.WIKIROOT} does not exist on file system.`);

  // preparation
  pathname = pathname.replace(/%20/g,' ');
  const realpath = getRealpath(pathname);
  if (!realpath) return { newFile:true };//debug(`Realpath is null. Unable to continue. My whole life is a lie.`);
  // if (realpath=='~~YESDIRNOFILE~~') return debug(`Valid directory, no index found. Should generate auto index. TBI.`);
  const noFile     = realpath=='~~YESDIRNOFILE~~';
  const articleName = noFile ? '' : getArticleName(pathname, noFile);
  const articleExt = path.extname(realpath);
  const filepath   = noFile ? null : realpath;
  const dirpath    = noFile ? path.join(process.env.WIKIROOT, pathname) : path.dirname(filepath);
  const db         = getDB(pathname);

  // the good stuff
  const content = (noFile||options.index) ? getAutoIndex(dirpath) : getContent(filepath, db);
  const menu = getMenu(dirpath, db);
  const style = getStyle(dirpath);
  const script = getScript(dirpath);
  const urls = getUrls(db, pathname);
  const title = `${db} > ${articleName}`;

  return { content, filepath, menu, script, style, title, urls };
}

function getArticleName(pathname) {
  // return matchOne(pathname, /([\/]+)$/);
  return pathname.match( /[^\/]*$/ )[0];
}

function getAutoIndex(dirpath) {
  const index = autoIndex.get(dirpath);

  return { final: `<ul>${index.map( file => `<li><a href="${file.link}">${file.name}</a>` ).join('')}</ul>` };
}

const extRE = /\.[^/.]+$/;

function getContent(filepath, db) {
  // given an absolute file path, load file and translate if necessary
  const ext = path.extname(filepath);
  const raw = fs.readFileSync(filepath).toString();
  const ls = fs.readdirSync(path.dirname(filepath)).map( f => f.replace(extRE, ''));
  const articleName = filepath.split(path.sep).pop().replace(extRE, '');
  const options = { db, noTOC:true, allArticles:ls };
  if (ext=='.html') return { final:raw, raw };
  if (ext=='.md') return { final:markdown.render(raw), raw };
  if (ext=='.txt') return { final:WikiUtil.wikiToHtml(raw, articleName, options).html, raw };
  return '~NOFILE~';
}

function getDB(pathname) {
  const chunks = pathname.split('/');
  if (chunks.length < 1) return null;
  return chunks[1];
}

function getMenu(dirpath, db) {
  // look for menu.yml, menu.html, or menu.txt in current directory
  // if found, return. else move up one directory and repeat
  // end when current directory < WIKIROOT or iterations > MAX_ITERATIONS

  let i = 0;
  const MAX_ITERATIONS = 10;
  const menuFile = recurse(dirpath);
  if (!menuFile) return getAutoIndex(dirpath);
  else return render(menuFile);

  function recurse(dirpath) {
    if (isFile(path.join(dirpath, '_menu.yml'))) return path.join(dirpath, '_menu.yml');
    if (isFile(path.join(dirpath, '_menu.html'))) return path.join(dirpath, '_menu.html');
    if (isFile(path.join(dirpath, '_menu.txt'))) return path.join(dirpath, '_menu.txt');
    // const newPath = path.dirname(dirpath).split(path.sep).pop();
    const newPath = path.dirname(dirpath);
    // if (path.relative(process.env.WIKIROOT, newPath).includes('..') || i++ > MAX_ITERATIONS) return;
    if (i++ > MAX_ITERATIONS) return;
    return recurse(newPath);
  }
  function render(filepath) {
    const content = fs.readFileSync(filepath).toString();
    const ext = path.extname(filepath);
    const ls = fs.readdirSync(path.dirname(filepath)).map( f => f.replace(extRE, ''));
    const articleName = filepath.split(path.sep).pop().replace(extRE, '');
    const options = { db, noTOC:true, allArticles:ls, noH1:true };
    if (ext=='.html') return content;
    if (ext=='.txt') return WikiUtil.wikiToHtml(content, articleName, options).html;
    if (ext=='.yml') return 'YML MENU NOT YET SUPPORTED';
  }
}

function getStyle(dirpath) {
  // look for style.css in current directory
  // if found, return. else move up one directory and repeat
  // end when current directory < WIKIROOT or iterations > MAX_ITERATIONS

  let i = 0;
  const MAX_ITERATIONS = 10;
  const styleFile = recurse(dirpath);
  if (!styleFile) return '/* ~NOSTYLE~ */';
  else return fs.readFileSync(styleFile).toString();

  function recurse(dirpath) {
    if (isFile(path.join(dirpath, 'style.css'))) return path.join(dirpath, 'style.css');
    if (isFile(path.join(dirpath, '_style.txt'))) return path.join(dirpath, '_style.txt');
    // const newPath = path.dirname(dirpath).split(path.sep).pop(); // what? this just gets the current dirname by itself...not the whole path, which we need
    const newPath = path.dirname(dirpath);
    // if (path.relative(process.env.WIKIROOT, newPath).includes('..') || i++ > MAX_ITERATIONS) return; // I do not understand what this line is trying to do (something about security?), but it's preventing recursion 100% of the time
    if (i++ > MAX_ITERATIONS) return;
    return recurse(newPath);
  }
}

function getScript(dirpath) {
  // look for script.js in current directory
  // if found, return. else move up one directory and repeat
  // end when current directory < WIKIROOT or iterations > MAX_ITERATIONS

  let i = 0;
  const MAX_ITERATIONS = 10;
  const styleFile = recurse(dirpath);
  if (!styleFile) return `console.log('no custom script found')`;
  else return fs.readFileSync(styleFile).toString();

  function recurse(dirpath) {
    if (isFile(path.join(dirpath, 'script.js'))) return path.join(dirpath, 'script.js');
    const newPath = path.dirname(dirpath).split(path.sep).pop();
    if (path.relative(process.env.WIKIROOT, newPath).includes('..') || i++ > MAX_ITERATIONS) return;
    return recurse(newPath);
  }
}

function getRealpath(pathname) {
  /* MD
  * Convert pathname into a full path
  ** If it's an exact filename, path.join(WIKIROOT, pathname) will work
  ** If it's an exact dirname, path.join(WIKIROOT, pathname) will work
  ** If it's a file without extension, try to add .html, .txt, etc until it works
  ** If all of those fail, end.
  */
  const fullpath = path.join(process.env.WIKIROOT, pathname);
  if (isFile(fullpath)) return fullpath; // that was easy
  if (isFile(fullpath+'.md')) return fullpath+'.md';
  if (isFile(fullpath+'.html')) return fullpath+'.html';
  if (isFile(fullpath+'.txt')) return fullpath+'.txt';
  if (isDir(fullpath)) {
    if (isFile(path.join(fullpath, '/index.md'))) return path.join(fullpath, '/index.md');
    if (isFile(path.join(fullpath, '/index.html'))) return path.join(fullpath, '/index.html');
    if (isFile(path.join(fullpath, '/index.txt'))) return path.join(fullpath, '/index.txt');
    if (isFile(path.join(fullpath, '/_home.txt'))) return path.join(fullpath, '/_home.txt');
    return '~~YESDIRNOFILE~~';
  }

  return null;
}

function getUrls(db, pathname) {
  return {
    allArticles: clean(`/${db}/all`),
    edit: clean(`${pathname}/edit`),
    editMenu: clean(`${db}/_menu/edit`),
  }

  function clean(url) {
    return url.replace(/\/\//g,'/');
  }
}




function isDir(path) {
  return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}
function isFile(path) {
  return fs.existsSync(path) && fs.lstatSync(path).isFile();
}
