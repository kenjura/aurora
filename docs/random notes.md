
# notes

Glossary:
+ qualifiedpath: fully-qualified pathname to actual file (including undefined), but still relative to "/"
+ fspath: full, absolute file system pathname (never expose to frontend)

+ State
  + userpath: user-specified pathname
  + article
    + isFile, isDir, exists, extension, qualifiedpath, fspath, contents, rendered
  + menu
  	+ isFile, isDir, exists, extension, qualifiedpath, fspath, contents, rendered
  + style
  	+ isFile, isDir, exists, extension, qualifiedpath, fspath, contents, rendered
  + fileList

Notes:
+ If menu isn't found, contents should be empty, but rendered will still include autoIndex
+ fileList is an array of all files, with relative paths and depth (current === 0)


FileLoader:
+ knows how to load a file, given a userpath
+ inputs:
  + userpath
  + filenames: array of filenames (where {filename} is a dynamic token)
  + extensions: array of extensions
+ dependencies:
  + resolver
+ example:
  + loading an article
    + userpath = '/foo'
    + filenames = [ '{filename}/{filename}', '{filename}/\_index', '{filename}/index', '{filename}', '\_index', 'index' ]

