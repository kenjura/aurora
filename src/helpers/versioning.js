const fs = require('fs');
const path = require('path');

const VERSIONS_FOLDER = '_versions';

/**
 * Detects if the current path is within a versioned folder structure
 * and extracts version information.
 * 
 * @param {string} pathname - The URL pathname (e.g., /wiki/foo/_versions/1.0/bar)
 * @param {string} wikiroot - The WIKIROOT path
 * @returns {object} Version info object
 */
function getVersionInfo(pathname, wikiroot) {
  const result = {
    isVersioned: false,
    currentVersion: null,
    availableVersions: [],
    basePathname: pathname,      // pathname without version prefix
    versionedBasePath: null,     // the folder that contains _versions
  };

  // Check if we're inside a _versions folder (use non-greedy match for basePath to get FIRST occurrence)
  const versionMatch = pathname.match(/^(.*?)\/(_versions)\/([^\/]+)(\/.*)?$/);
  
  if (versionMatch) {
    const basePath = versionMatch[1];           // e.g., /wiki/foo
    const versionName = versionMatch[3];        // e.g., 1.0
    const remainingPath = versionMatch[4] || ''; // e.g., /bar
    
    // Check for nested _versions (not allowed)
    if (remainingPath.includes(`/${VERSIONS_FOLDER}/`)) {
      console.warn(`[versioning] WARNING: Nested _versions folder detected in path: ${pathname}. The inner _versions folder will be ignored for versioning purposes.`);
      // Still proceed with the first (outer) _versions folder
    }
    
    result.isVersioned = true;
    result.currentVersion = versionName;
    result.basePathname = basePath + remainingPath;
    result.versionedBasePath = basePath;
    
    // Get available versions from the first _versions folder only
    const versionsDir = path.join(wikiroot, basePath, VERSIONS_FOLDER);
    result.availableVersions = getAvailableVersions(versionsDir);
  } else {
    // Check if the current folder has a _versions subfolder
    const fullpath = path.join(wikiroot, pathname);
    
    // Find the directory we're in (could be a file path)
    let dirpath = fullpath;
    if (fs.existsSync(fullpath) && fs.lstatSync(fullpath).isFile()) {
      dirpath = path.dirname(fullpath);
    } else if (!fs.existsSync(fullpath)) {
      // Try parent directory if exact path doesn't exist
      dirpath = path.dirname(fullpath);
    }
    
    // Look for _versions folder in current or parent directories
    const versionedDir = findVersionsFolder(dirpath, wikiroot);
    if (versionedDir) {
      const versionsDir = path.join(versionedDir, VERSIONS_FOLDER);
      result.availableVersions = getAvailableVersions(versionsDir);
      result.versionedBasePath = '/' + path.relative(wikiroot, versionedDir).replace(/\\/g, '/');
      
      if (result.availableVersions.length > 0) {
        // Mark that versions are available even if we're viewing current version
        result.isVersioned = true;
        result.currentVersion = 'current';
      }
    }
  }
  
  return result;
}

/**
 * Find the nearest parent directory (or current) that contains a _versions folder
 */
function findVersionsFolder(dirpath, wikiroot) {
  const wikirootResolved = path.resolve(wikiroot);
  let current = path.resolve(dirpath);
  
  // Don't go above wikiroot
  while (current.startsWith(wikirootResolved)) {
    const versionsPath = path.join(current, VERSIONS_FOLDER);
    if (fs.existsSync(versionsPath) && fs.lstatSync(versionsPath).isDirectory()) {
      // Check if this _versions folder is nested inside another _versions (not allowed)
      const relativePath = path.relative(wikirootResolved, current);
      if (relativePath.includes(VERSIONS_FOLDER)) {
        console.warn(`[versioning] WARNING: Found _versions folder inside versioned content at ${versionsPath}. Ignoring.`);
        return null;
      }
      return current;
    }
    
    // Move up one directory
    const parent = path.dirname(current);
    if (parent === current) break; // reached root
    current = parent;
  }
  
  return null;
}

/**
 * Get list of available versions from a _versions directory
 */
function getAvailableVersions(versionsDir) {
  if (!fs.existsSync(versionsDir)) return [];
  
  try {
    const entries = fs.readdirSync(versionsDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .filter(entry => !entry.name.startsWith('.'))
      .map(entry => entry.name)
      .sort(compareVersions);
  } catch (err) {
    console.error('[versioning] Error reading versions directory:', err);
    return [];
  }
}

/**
 * Compare version strings for sorting (handles semver-like versions)
 */
function compareVersions(a, b) {
  const partsA = a.split(/[.\-_]/).map(p => parseInt(p, 10) || p);
  const partsB = b.split(/[.\-_]/).map(p => parseInt(p, 10) || p);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] ?? 0;
    const partB = partsB[i] ?? 0;
    
    if (typeof partA === 'number' && typeof partB === 'number') {
      if (partA !== partB) return partA - partB;
    } else {
      const cmp = String(partA).localeCompare(String(partB));
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/**
 * Generate URL for switching to a different version
 */
function getVersionUrl(pathname, versionInfo, targetVersion) {
  if (targetVersion === 'current') {
    // Return the base pathname (non-versioned path)
    return versionInfo.basePathname || pathname;
  }
  
  if (versionInfo.currentVersion === 'current') {
    // Currently viewing current version, switching to a specific version
    // Get the relative path from versionedBasePath
    const relativePath = pathname.replace(versionInfo.versionedBasePath, '');
    return `${versionInfo.versionedBasePath}/${VERSIONS_FOLDER}/${targetVersion}${relativePath}`;
  } else {
    // Currently viewing a specific version, switching to another version
    // Handle both cases: with trailing path and without
    const versionPattern = new RegExp(`/${VERSIONS_FOLDER}/${versionInfo.currentVersion}(/|$)`);
    return pathname.replace(versionPattern, `/${VERSIONS_FOLDER}/${targetVersion}$1`);
  }
}

/**
 * Check if a path should be excluded from menus (is a _versions folder)
 */
function isVersionsFolder(name) {
  return name === VERSIONS_FOLDER;
}

module.exports = {
  VERSIONS_FOLDER,
  getVersionInfo,
  getAvailableVersions,
  getVersionUrl,
  isVersionsFolder,
  findVersionsFolder,
};
