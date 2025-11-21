#!/usr/bin/env node

require('dotenv').config({path: process.env.DOTENVFILE || '/etc/aurora.env'});

if (!process.env.WIKIROOT) {
  console.error('WIKIROOT is not set. Please set it in your environment or in the .env file.');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const model = require('./model/model');
const htmlEngine = require('./helpers/htmlEngine');
const { getArticleList } = require('./helpers/getFilesRecursively');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const BUILD_DIR = path.join(__dirname, '..', 'build');
const STATIC_DIR = path.join(__dirname, 'static');
const WIKIROOT = process.env.WIKIROOT;

// File extensions that should be copied as static assets from WIKIROOT
const STATIC_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.pdf', '.zip', '.json', '.woff', '.woff2', '.ttf', '.eot'];

// Mock Express app for htmlEngine
const mockApp = {
  engine: () => {},
  set: () => {}
};

// Initialize htmlEngine to get the render function
htmlEngine(mockApp);

// Custom render function that mimics Express res.render
function renderTemplate(templateName, data) {
  return new Promise((resolve, reject) => {
    const templatePath = path.join(__dirname, 'views', `${templateName}.html`);
    
    // Include function for template rendering
    function include(filename) {
      const pathname = path.join(__dirname, 'views', filename);
      if (!fs.existsSync(pathname)) return '';
      const content = fs.readFileSync(pathname).toString();
      return interpolate(content, data);
    }

    // Interpolation function from htmlEngine
    function interpolate(str, scope) {
      return str.replace(/\{\{(.*?)\}\}/g, function(em, g1) {
        try {
          return eval(g1);
        } catch(e) {
          console.error('htmlEngine > interpolate > interpolation error:', e);
          return '??eval error??';
        }
      });
    }
    
    // Use the same htmlEngine logic
    fs.readFile(templatePath, function (err, content) {
      if (err) return reject(new Error(err));

      const layout = data.layout || 'layout';
      const layoutHtml = fs.readFileSync(`${__dirname}/views/${layout}.html`).toString();
      const innerHtml = content.toString();
      const combined = layoutHtml.replace('{{innerHtml}}', innerHtml);
      
      const interpolated = interpolate(combined, data);
      resolve(interpolated);
    });
  });
}

// Copy static files recursively
async function copyStaticFiles(src, dest) {
  try {
    await mkdir(dest, { recursive: true });
    const items = await readdir(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stats = await stat(srcPath);
      
      if (stats.isDirectory()) {
        await copyStaticFiles(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`Error copying static files from ${src} to ${dest}:`, error);
  }
}

// Get all wiki paths that should be rendered
async function getAllWikiPaths(wikiroot) {
  const paths = new Set();
  const staticFiles = [];
  
  async function walkDirectory(dir, relativePath = '') {
    try {
      const items = await readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          await walkDirectory(fullPath, itemRelativePath);
          
          // Add directory path - this will resolve to index files or auto-index
          paths.add(itemRelativePath);
        } else {
          const ext = path.extname(item).toLowerCase();
          
          // Check if it's a static asset
          if (STATIC_EXTENSIONS.includes(ext)) {
            staticFiles.push({
              src: fullPath,
              dest: itemRelativePath
            });
          } else if (['.md', '.txt', '.html'].includes(ext)) {
            // For wiki content files, add the path without extension
            // This matches how autoIndex generates links and how getRealpath resolves them
            const pathWithoutExt = itemRelativePath.replace(ext, '');
            paths.add(pathWithoutExt);
            // Also add edit route
            paths.add(pathWithoutExt + '/edit');
          }
        }
      }
    } catch (error) {
      console.error(`Error walking directory ${dir}:`, error);
    }
  }
  
  await walkDirectory(wikiroot);
  
  // Add root path
  paths.add('');
  
  return { paths: Array.from(paths), staticFiles };
}

// Main build function
async function build(options = {}) {
  const { pathMatch } = options;
  console.log('Starting static site build...');
  if (pathMatch) {
    console.log(`Filtering paths matching: ${pathMatch}`);
  }
  
  try {
    // Initialize model file cache (same as the live app does)
    await model.getAllFilesInWikiroot();
    
    // Create build directory
    await mkdir(BUILD_DIR, { recursive: true });
    
    // Copy static assets from Aurora
    console.log('Copying Aurora static assets...');
    await copyStaticFiles(STATIC_DIR, path.join(BUILD_DIR, 'static'));
    
    // Get all wiki paths and static files
    console.log('Discovering wiki paths and static files...');
    const { paths: allWikiPaths, staticFiles } = await getAllWikiPaths(WIKIROOT);
    
    // Filter paths if pathMatch is specified
    let wikiPaths = allWikiPaths;
    if (pathMatch) {
      wikiPaths = allWikiPaths.filter(path => {
        const fullPath = '/' + path;
        return fullPath.includes(pathMatch) || fullPath === '/'; // Always include root
      });
      console.log(`Filtered from ${allWikiPaths.length} to ${wikiPaths.length} paths`);
    }
    
    console.log(`Found ${wikiPaths.length} paths to render and ${staticFiles.length} static files to copy`);
    
    // Copy static files from WIKIROOT
    console.log('Copying WIKIROOT static files...');
    for (const file of staticFiles) {
      try {
        const destPath = path.join(BUILD_DIR, file.dest);
        await mkdir(path.dirname(destPath), { recursive: true });
        await copyFile(file.src, destPath);
        console.log(`  ✓ Copied: ${file.dest}`);
      } catch (error) {
        console.error(`  ✗ Error copying ${file.dest}:`, error.message);
      }
    }
    
    // Process each path
    for (let i = 0; i < wikiPaths.length; i++) {
      const pathname = '/' + wikiPaths[i];
      console.log(`Processing ${i + 1}/${wikiPaths.length}: ${pathname}`);
      
      try {
        // Determine mode and clean pathname
        let mode = 'view';
        let cleanPathname = pathname;
        if (pathname.endsWith('/edit')) {
          mode = 'edit';
          cleanPathname = pathname.substring(0, pathname.length - 5);
        }
        
        // Build model data (same as live app)
        const data = model.build(cleanPathname);
        
        if (!data) {
          console.log(`  No data for ${pathname}, rendering no_article`);
          const html = await renderTemplate('no_article', {});
          const outputPath = path.join(BUILD_DIR, pathname.substring(1) || 'index') + '.html';
          await mkdir(path.dirname(outputPath), { recursive: true });
          await writeFile(outputPath, html);
          continue;
        }
        
        if (data === 404) {
          console.log(`  404 for ${pathname}, rendering 404`);
          const html = await renderTemplate('404', {});
          const outputPath = path.join(BUILD_DIR, pathname.substring(1) || 'index') + '.html';
          await mkdir(path.dirname(outputPath), { recursive: true });
          await writeFile(outputPath, html);
          continue;
        }
        
        if (data.newFile) {
          console.log(`  New file for ${pathname}, rendering edit`);
          const html = await renderTemplate('edit', data);
          const outputPath = path.join(BUILD_DIR, pathname.substring(1) || 'index') + '.html';
          await mkdir(path.dirname(outputPath), { recursive: true });
          await writeFile(outputPath, html);
          continue;
        }
        
        // Add mock user and other data that the live app provides
        const breadcrumbs = '';
        const user = { displayName: 'not logged in' };
        
        // Calculate auto-index if we're in a directory
        const fullpath = path.join(WIKIROOT, cleanPathname === '/' ? '' : cleanPathname);
        let isDir = false;
        let index = '';
        
        try {
          const stats = fs.statSync(fullpath);
          isDir = stats.isDirectory();
          
          if (isDir || pathname === '/') {
            // Generate auto-index for directories or root
            const autoIndex = require('./helpers/autoIndex');
            const indexPath = pathname === '/' ? WIKIROOT : fullpath;
            const allFiles = autoIndex.get(indexPath);
            index = allFiles
              .map(file => `<li><a href="${file.link}">${file.name}</a></li>`)
              .join('');
          }
        } catch (e) {
          // Path doesn't exist as directory, that's fine
        }
        
        const renderData = Object.assign({ 
          breadcrumbs, 
          mode, 
          user, 
          index, 
          isDir 
        }, data);
        
        // Render the template
        const html = await renderTemplate(mode, renderData);
        
        // Write to build directory with simple path mapping
        let outputPath;
        if (pathname === '/' || pathname === '') {
          outputPath = path.join(BUILD_DIR, 'index.html');
        } else {
          // Convert URL path to file path
          // Remove leading slash and add .html extension
          const cleanPath = pathname.substring(1);
          outputPath = path.join(BUILD_DIR, cleanPath + '.html');
        }
        
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, html);
        
        console.log(`  ✓ Generated: ${outputPath}`);
        
      } catch (error) {
        console.error(`  ✗ Error processing ${pathname}:`, error.message);
      }
    }
    
    console.log('Build completed successfully!');
    console.log(`Static site generated in: ${BUILD_DIR}`);
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--path-match=')) {
      options.pathMatch = arg.split('=')[1];
    } else if (arg === '--path-match' && i + 1 < args.length) {
      options.pathMatch = args[i + 1];
      i++; // Skip next argument
    }
  }
  
  build(options);
}

module.exports = { build };
