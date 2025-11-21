# Aurora Static Site Builder

The Aurora wiki now includes the ability to generate a static site that mirrors the live site functionality.

## Prerequisites

You need the same environment setup as running the live Aurora app:

1. Set up your environment file (copy `aurora.env.example` to `/etc/aurora.env` or set `DOTENVFILE`)
2. Ensure `WIKIROOT` points to your wiki content directory
3. Install dependencies: `npm install`

## Building the Static Site

### Test your environment first:
```bash
npm run build:test
```

### Build the static site:
```bash
# Build the entire site
npm run build

# Build only paths containing a specific string
npm run build -- --path-match=/5e
# or
node src/build.js --path-match=/5e

# Build only a specific section
npm run build -- --path-match=/docs
```

The static site will be generated in the `build/` directory.

## What gets built

- All wiki articles (`.md`, `.txt`, `.html` files) are rendered as static HTML
- Directory auto-indexes are generated for directories without index files
- Edit pages are generated for all articles
- Static assets from both Aurora (`src/static/`) and your wiki content are copied
- The same templates, styling, and rendering logic as the live site are used

### Filtering builds

You can build only specific sections of your wiki using the `--path-match` parameter:

- `--path-match=/5e` - Build only paths containing "/5e"
- `--path-match=/docs` - Build only documentation paths
- The root path (`/`) is always included to maintain navigation

This is useful for large wikis where you only want to build and deploy specific sections.

## Deployment

The `build/` directory contains a complete static website that can be deployed to any web server. All internal links should work correctly, assuming you deploy to the root of a domain or configure your web server to handle the URL structure properly.

## URL Structure

The static site maintains the same URL structure as the live Aurora app:

- `/` - Home page (auto-index of WIKIROOT)
- `/path/to/article` - Article pages
- `/path/to/article/edit` - Edit pages
- `/static/...` - Aurora assets
- Static files from WIKIROOT maintain their original paths

The build process uses the same path resolution logic as the live app, so links in your wiki content will work correctly in the static version.
