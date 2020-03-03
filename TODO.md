# definitely
+ [ ] fix "all articles" page (autoIndex links are all fucked up). Add support for folder structure.
+ [ ] use AJAX to populate active/inactive links?


# maybe
+ [ ] get isDir, accurate filepath/dirpath in model, use that for autoIndex, use *that* for menu
+ [ ] distinguish between ambiguous and unambiguous URLs
  + [ ] ambiguous URL: not sure if file or folder (doesn't end in /). Handle by looking up, disambiguating, and redirecting
  + [ ] unambiguous URL: certain it's a file or folder (extension not relevant). Current default.
+ [ ] when articlePath is a directory, rewrite URL to end in /, so relative links will work correctly


