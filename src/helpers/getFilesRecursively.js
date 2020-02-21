const fg = require('fast-glob');

module.exports = { getArticleList };

async function getArticleList(dirpath) {
  const entries = await fg([`${dirpath}/**/*.(html|md|txt)`], { dot: false });
  return entries.map(entry => entry.replace(process.env.WIKIROOT, ''));
}