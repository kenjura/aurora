const fs = require('fs');
const path = require('path');

/**
 * Recursively search up from a directory for a config.json with { automenuRoot: true }
 * Returns the directory path if found, else null
 */
function findAutomenuRoot(startDir, wikiroot) {
  let dir = path.resolve(startDir);
  wikiroot = path.resolve(wikiroot);
  let i = 0;
  const MAX_ITERATIONS = 20;
  while (dir.startsWith(wikiroot) && i++ < MAX_ITERATIONS) {
    const configPath = path.join(dir, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.automenuRoot) return dir;
      } catch (e) {
        // ignore parse errors
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

module.exports = { findAutomenuRoot };
