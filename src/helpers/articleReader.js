const debug = require('debug')('aurora:articleReader');
const fs = require('fs');
const path = require('path');
const WikiUtil = require('./WikiUtil');

module.exports = function(pathname) {
	// 3 main jobs: get menu, get style, and get current article
	// current article might be an auto-index page, and menu might be an auto menu

	// first things first. if no wikiroot, die immediateliy
	if (!process.env.WIKIROOT) return console.error('articleReader > ERROR > no WIKIROOT environment variable found.');
	if (!fs.existsSync(process.env.WIKIROOT)) return console.error(`articleReader > ERROR > WIKIROOT ${process.env.WIKIROOT} does not exist on file system.`);

	pathname = pathname.replace( /%20/g , ' ' );

	const model = buildModel(pathname);
	debug('model',model);

	const menu = getMenu3(model);
	// const menuHtml = menu.map( m => m.html ).join('');

	// now let's figure out our working directory. current pathname might be a file's exact path, or a file without extension, or an actual directory
	const currentPath = path.join(process.env.WIKIROOT, pathname);
	const pathType = isDir(currentPath) && 'directory' || isFile(currentPath) && 'file' || 'neither';

	// if current path is a file, find the directory part of the path; we'll need it to render a menu
	const dirPath = pathType=='file' && path.dirname(currentPath) || pathType=='directory' && currentPath || null;
	const filename = pathType=='file' && path.basename(currentPath) || null;
	if (pathType=='file') pathname = pathname.replace(filename,'');

	// const menu = getMenu(pathname, dirPath);
	const style = getStyle(dirPath);
	// const content = pathType=='file' && getFile(currentPath) || pathType=='directory' && getIndex(pathname, dirPath) || 'unknown content';
	const content = model.file;

	return { content, menu, style }
}


function buildModel(pathname) {
	// builds an entire functional model of the current menu, article, and style, with no regard for how it is visually displayed

	// assumptions:
	//  - current path matches (/\w+){0,}/(\w+)(\.\w+)?
	//  - group 1 is a folder path relative to WIKIROOT
	//  - group 2 is the name of the current file or folder
	//  - group 3 is the optional extension of current file
	//  - system enforces uniqueness of folder and filenames: you can't create foo.html in a folder with a subfolder called foo, nor foo.txt if foo.html exists
	// logic:
	//  - first, test full path to see if it is a directory.
	//  - if not, test to see if it is one of the supported file types (e.g. html, txt)
	//  - else, fail due to invalid path

	const curPath = path.join(process.env.WIKIROOT, pathname);

	const pathIsDirectory = isDir(curPath);
	const pathIsFile = isFile(curPath) || isFile(path.join(curPath, '.html')) || isFile(path.join(curPath, '.txt'));


	const cwd = pathIsFile && path.dirname(curPath) || curPath;
	const matches = String(pathname).match( /((?:\/\w+){0,})\/(\w+)(\.\w+)?/ ) || [];
	const pathRoot = matches[1];
	const articleName = matches[2];
	const fileExt = matches[3];

	const filePath = pathIsFile && isFile(curPath) && curPath
		|| isFile(path.join(curPath, '.md')) && path.join(curPath, '.md')
		|| isFile(path.join(curPath, '.html')) && path.join(curPath, '.html')
		|| isFile(path.join(curPath, '.txt')) && path.join(curPath, '.txt')
		|| null;
	console.log('filePath=',filePath);

	const ls = fs.readdirSync(cwd);
	const file = pathIsFile && fs.readFileSync(filePath).toString() || '';

	return { pathname, curPath, pathIsFile, pathIsDirectory, cwd, pathRoot, articleName, fileExt, ls, file };
}

function getFile(filepath) {
	if (!fs.existsSync(filepath)) return 'file does not exist';
	let content = fs.readFileSync(filepath).toString();
	if (filepath.substr(-4)=='.txt') content = WikiUtil.wikiToHtml(content,'articleName').html;
	// if (filepath.substr(-4)=='.md') content = WikiUtil.wikiToHtml(content,'articleName').html;
	return content;
}
function getIndex(pathname, dirpath) {
	const menu = fs.readdirSync(dirpath)
		.filter( filename => filename.substr(0,1)!='_' )
		.map( filename => `<li>
			<a href="${getMenuItemPath(pathname, filename)}">${filename}</a>
		</li>` )
		.join('');
	return `<ul>${menu}</ul>`;
}


function getMenu(pathname, dirPath) {
	if (!dirPath) {
		console.error('articleReader > getMenu > error: dirPath is not defined.');
		return '';
	}

	// step 1: is there a _menu.html or _menu.wikitext? If so, load it.
	const menuHtmlPath = path.join(dirPath, '_menu.html');
	const menuTextPath = path.join(dirPath, '_menu.txt');
	if (fs.existsSync(menuHtmlPath)) return fs.readFileSync(menuHtmlPath);
	if (fs.existsSync(menuTextPath)) return fs.readFileSync(menuTextPath);

	// step 2: else, render an automenu
	const currentDir = dirPath;
	const menu = fs.readdirSync(currentDir)
		.filter( filename => filename.substr(0,1)!='_' )
		.map( filename => `<span class="dropdown">
			<a href="${getMenuItemPath(pathname, filename)}">${filename}</a>
		</span>` )
		.join('');
	return menu;
}

function getMenu2(model) {
	// read the ls entries for the current directory
	// figure out which are files and which are directories
	// apply sorting and filtering logic (TBD)
	// return description of menu, along with markup

	const menu = model.ls.map( entry => ({
		name: entry.replace(/\..+/,''),
		path: model.pathRoot + entry
	})).map( entry => {
		entry.html =`<span class="dropdown"><a href="${entry.path}">${entry.name}</a></span>`;
		return entry;
	});
	return menu;
}

function getMenu3(model) {
	if (!model.pathRoot) return ''; // assume top-level (to do: render an index automatically)
	const db = (model.pathRoot.match( /^\/([^\/]+)/ )||[])[1];
	const menu = recurse(model.cwd);
	return menu;

	var i = 0, MAX_RECURSION = 5;
	function recurse(directory) {
		// look for _menu.html or _menu.txt in curpath
		// if found, return contents. else, cd .. and recurse
		if (i++ > MAX_RECURSION) {
			console.error('articleReader > getMenu > too much recursion.');
			return;
		}
		const menuHtml = readFileIfExists(path.join(directory, '_menu.html'));
		const menuText = wikiToHtml(readFileIfExists(path.join(directory, '_menu.txt')), '_menu.txt', db);
		if (menuHtml) return menuHtml;
		if (menuText) return menuText;
		return recurse(path.dirname(directory).split(path.sep).pop())
	}
}

function getStyle(dirpath) {
	// warning: HACKISH!!!
	let style = '';
	let i = 0;
	while (style=='' && i<5) {
		style = readFileIfExists(path.join(dirpath, '../'.repeat(i), '_style.css'));
		i++
	}
	return style;
}

function isDir(path) {
	return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}
function isFile(path) {
	return fs.existsSync(path) && fs.lstatSync(path).isFile();
}

function readFileIfExists(path, wikiToHtml) {
	return fs.existsSync(path) && fs.readFileSync(path).toString() || '';
}
function wikiToHtml(wikitext, articleName='articleName', db='db') {
	return wikitext && WikiUtil.wikiToHtml(wikitext, articleName, { db }).html || '';
}
function getMenuItemPath(pathname, filename) {
	const href = `${pathname}/${filename}`;
	return href.replace( /\/{2,}/g, '/' );
}