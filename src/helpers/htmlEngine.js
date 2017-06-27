const fs   = require('fs');
const path = require('path');

module.exports = function(app) {
  app.engine('html',htmlEngine);
  app.set('view engine','html');
}


function htmlEngine(filePath, options, callback) {
  fs.readFile(filePath, function (err, content) {
    if (err) return callback(new Error(err));

    const layout = options.layout || 'layout';
    const layoutHtml = fs.readFileSync(`${__dirname}/../views/${layout}.html`).toString();

    const innerHtml = content.toString();

    const combined = layoutHtml.replace( '{{innerHtml}}', innerHtml );

    const interpolated = interpolate(combined,options);

    return callback(null, interpolated);
  });


  function include(filename) {
    const pathname = path.join(__dirname,'../views',filename);
    console.log('htmlEngine > including pathname ',pathname);
    if (!fs.existsSync(pathname)) return '';
    const content = fs.readFileSync(pathname).toString();
    return interpolate(content,options);
  }
  function interpolate(str,scope) {
    return str.replace( /\{\{([^}]+)\}\}/g , function(em,g1) {
      try {
        return eval(g1);
      } catch(e) {
        console.error('htmlEngine > interpolate > interpolation error:',e);
        return '??eval error??';
      }
    });
  }
}

