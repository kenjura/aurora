# 0.12.0
+ 2020-02-27
+ autoIndex can now generate a menu for folders that don't have one (relative to current directory)
+ added, then removed url-rewrite capability designed to force URLs to have a trailing slash when viewing an index file (so that relative links work correctly). This feature needs work.
+ server now serves images and webfonts in WIKIROOT
+ added support for menus in markdown format
+ added a very rudimentary mobile style
+ rewrote 404 page, now async fetches candidate article links
+ added new search endpoint that can handle folder structures beyond old-style /:db/:article
+ BUGFIX: markdown-it dependency was not handling GFM link syntax correctly (spaces in link destination are supported inside <brackets>)
+ CLEANUP: CSS for asides moved into core (previously inside test site css)

# 0.11.0
+ 2019-11-26
+ markdown rendering improvements:
  + added support for containers, deflists, and superscript
  + moved markdown rendering into helper
+ BUGFIX: fixed issue where directory autoIndexes weren't generating for markdown indices
+ IMPROVEMENT: root page is now a (rough) autoIndex

# 0.10.0
+ 2019-08-10
+ lists in article view are now collapsible
+ added CHANGELOG

# 0.9.0
+ 2019-06-18
+ menu now appears when in a subfolder
+ audited all packaged
+ correctly handling images in wikiroot
+ fixed TOC links
+ added example config

# 0.8.0
+ 2019-05-02
+ added support for sectioning in markdown documents

# 0.7.0
+ 2018-11-28
+ added markdown support
+ removed event-stream vulnerability
+ added more documentation

# 0.6.0
+ 2018-10-04
+ added rate limiter
+ added bots for migrating mediawiki and mybb to text

# 0.5.0
+ 2017-10-12
+ rewrote API

# 0.4.0
+ 2017-07-05
+ added search feature
+ rearranged layout

# 0.3.0
+ 2017-07-03
+ cleaned styles
+ add endpoint for saving articles
+ removed unnecessary code
+ added ACE editor

# 0.2.0
+ 2017-06-28
+ changed port to 3004
+ improved styling
+ very basic image support

# 0.1.0
+ 2017-06-27
+ Initial working alpha