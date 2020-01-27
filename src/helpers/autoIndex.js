const fs   = require('fs');
const path = require('path');

const IGNORE = [ 'DS_Store', '.git' ];

function get(dirpath) {
	 let stats, exists, isDir; // sigh
	try {
		stats = fs.lstatSync(dirpath);
		exists = true;
		isDir = stats.isDirectory();
	} catch(e) {
		exists = false;
	}
	if (!exists) throw new Error('model > getAutoIndex > not sure how we got this far, but dirpath does not exist, so autoIndex cannot be generated');
	const endingSlash = dirpath.substr(-1) === '/';
	const parent = path.join(dirpath, (isDir && !endingSlash ? '/' : ''), '..');

	const defaultFiles = [
  		{ link:parent, name:'(up)' },
  		{ link:getLink('.'), name:'(cur)' },
  	];
	const files = fs
		.readdirSync(dirpath)
		.filter(filterIgnores);

	return defaultFiles.concat(files.map( file => ({ link:getLink(file), name:getName(file) })));

  function getLink(listing) { return path.join(dirpath, listing).replace( process.env.WIKIROOT, '' ) }
  function getName(listing) { return listing.replace(extRE, '') }
}

function filterIgnores(filename) {
	return IGNORE.every(fn => filename.indexOf(fn) === -1);
}

const extRE = /\.[^/.]+$/;

module.exports = { extRE, get };