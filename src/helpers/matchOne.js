module.exports = function(str, re) {
  const matches = str.match(re);
  if (!matches || !Array.isArray(matches) || matches.length < 2 ) return null;
  return matches[1];
}