const fs   = require('fs');
const path = require('path');

function get(dirpath) {
  const files = fs.readdirSync(dirpath);

  return files.map( file => ({ link:getLink(file), name:getName(file) }));

  function getLink(listing) { return path.join(dirpath, listing).replace( process.env.WIKIROOT, '' ) }
  function getName(listing) { return listing.replace(extRE, '') }
}

const extRE = /\.[^/.]+$/;

module.exports = { extRE, get };