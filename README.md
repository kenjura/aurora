# aurora

It's a CMS in development.

## get started

* Create /etc/aurora.env on your local filesystem (see /docs/aurora.env.example for an example file)
* Run "npm start"


# Project Status

## works
* Rendering content, menus, and styles
* Facebook login
* Top menus
* Images (more or less)
* Active/inactive links

## doesn't work
* No editor
* Doesn't enforce login
* No image upload
* Only supports jpg and png images

## other todos
* Strip out old sectioning/TOC logic, replace with new frontend hotness
* Reconcile styles (remember, style.css is only read by Aurora, not Erza)



# Requirements

## high level

* Uses local filesystem for articles (directory designated by environment variable)
* Agnostic as to how you want to handle revision control. Could keep files in git repo, dropbox, etc
* Supports html (WYSIWYG or raw) and wikitext
* Can customize site style
* Can create one or more site templates, overriding default layout
* Uses Passport for auth (at start, only Facebook is supported)
* Mostly rendered on backend. If complex frontend is needed, will consider React

## to be determined

* Article files: should they be in a single, flat list, or support a tree structure of arbitrary depth?
** Flat list will be more performant and enforce unique names
** Tree structure allows automatic creation of menus, may simplify naming scheme. Makes writing wikitext links a lot harder

One idea:
* Single server, single wiki root
* First level are "dbs", similar to erza
* Each level expects a _menu and _style, not just the top level
** If no _menu, auto-generates based on articles in that directory
** If no _style, inherits from parent (or else default)
* Directories can be articles too
** If it contains an index.html or index.wikitext, render that
** Else, auto-render a list of contents
* Design
** Topnav: breadcrumbs, then links to current-folder articles
** Leftnav: TOC nav + admin, background = _badge?


Or maybe just use grav? https://github.com/getgrav/grav

## idea bin

* Articles could support markdown format
* Menus could support YAML format

## specific requirements

### Preparation

* Convert pathname into a full path
** If it's an exact filename, path.join(WIKIROOT, pathname) will work
** If it's an exact dirname, path.join(WIKIROOT, pathname) will work
** If it's a file without extension, try to add .html, .txt, etc until it works
** If all of those fail, end.

### Content

* First, look for a document with the exact path specified.
* If found, render (see below).
* Else, if no file extension, look for (curpath).html, (curpath).txt, etc.
* If found, render
* Else, assume path is a directory and look for (curpath)/index, then (curpath)/index.html, etc..
* If found, render
* Else, 404

Rendering:
* If file ext is null, show exact content, no translation
* If file ext is html, show exact content (should probably scrape out dangerous HTML)
* If file ext is txt or wikitext, run through WikiUtil
* Style only:
** Pass CSS straight through
** Future idea: SCSS/etc?
* Menu only:
** If file ext is yml, translate into menu (for _menu.yml only)


### Menu

* Determine current directory
** If curpath looks like a file, see if it is one.
** If so, get the basename and use that
** Else, see if curpath is a directory
** If it is, then use that
** Else, fail
* Check current directory for a valid menu
** Check for _menu.yml, then _menu.html, then _menu.txt.
** Return the first one found.
* If none found, move up one directory and repeat previous step
* Recurse until current directory == WIKIROOT
* If no menu found, generate an automenu based on WIKIROOT

### Style

* Same as menu, but for _style.css

(Probably also true for _badge.html and _layout.html, but we'll get to those...)