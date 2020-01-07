const fs   = require('fs');
const path = require('path');

const IGNORE = [ 'DS_Store', '.git' ];

function get(dirpath) {
	const defaultFiles = [
  		{ link:getLink('..'), name:'(up)' },
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