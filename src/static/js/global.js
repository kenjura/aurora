(function(){
  addGlobalHelpers();

  window.db = matchOne(window.location.pathname, /^\/([^\/]+)/);

  function addGlobalHelpers() {
    window.debounce = function(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    };

    window.matchOne = function(str, re) {
      const matches = str.match(re);
      if (!matches || !Array.isArray(matches) || matches.length < 2 ) return null;
      return matches[1];
    }
  }
})();
