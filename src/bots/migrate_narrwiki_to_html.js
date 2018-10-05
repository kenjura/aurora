require('dotenv').config({path: '/etc/aurora.env'});

var fs = require('fs-extra');
var mysql = require('mysql');

const host = process.env.MYSQL_HOST;
const user = process.env.MYSQL_USER;
const pass = process.env.MYSQL_PASS;
var sqlcfg = {
  host,
  user,
  pass,
};

var connection;

function go() {
  // args
  var example = 'example: node migrate_narrwiki_to_html.js narrwiki_foodb ~/Dropbox/www/bertball.com/faerun/ ~/foodb';
  var sourcedb = process.argv[2];
  if (!sourcedb) return console.error('Source DB required (arg 1). '+example);
  var imageroot = process.argv[3];
  if (!imageroot) return console.error('Image root required (arg 2). '+example);
  var dest = process.argv[4];
  if (!dest) return console.error('Destination required (arg 3). '+example);
  console.log('export.js > initialized. sourcedb=',sourcedb,', imageroot=',imageroot,', dest=',dest);

  // find destination
  var path = fs.realpathSync(dest);
  console.log('Output directory:',path);

  // start the database
  connection = mysql.createConnection({
    host:sqlcfg.host,
    user:sqlcfg.user,
    password:sqlcfg.pass
  });
  connection.connect();
  // if (!conn) return console.error('Error connecting to MySQL');

  // get the menu
  Article.get(sourcedb,'Special:Menu',function(err,menutext){
    if (err) return;
    fs.writeFileSync(path+'/_menu.txt',menutext);
  });

  // get styles
  // Article.get(sourcedb,'Special:Style',function(err,styletext){
  //  if (err) return;
  //  fs.writeFileSync(path+'/_style.txt',styletext);
  // });

  // get all images
  // var query = connection.query('SELECT * FROM '+sourcedb+'.image');
  // query
  //  .on('result',function(row){
  //    try {
  //      var imagepath = fs.realpathSync(imageroot+'/'+row.path);
  //      var newpath = path+'/img/'+row.name;
  //      fs.copySync(imagepath,newpath);
  //    } catch(e) {
  //      console.error('Image error: ',e)
  //    }
  //  });

  // get all articles
  var query = connection.query('SELECT DISTINCT(articleName) FROM '+sourcedb+'.revision;');
  query
    .on('error', function(err) {
      console.error('ERROR while getting all articles:',err);
    })
    .on('fields', function(fields) {
      // the field packets for the rows to follow
    })
    .on('result', function(row) {
      // Pausing the connnection is useful if your processing involves I/O
      // connection.pause();

      var articleName = row['articleName'];
      var filepath = path + '/' + articleName + '.txt';
      if (articleName=='Home') filepath = filepath.replace( 'Home.txt' , '_home.txt' );

      Article.get(sourcedb,articleName,function(err,articleText){
        fs.writeFile(filepath,articleText,function(err){
          if (err) console.error('ERROR writing file. articleName=',articleName);
          else console.error('Wrote article ',articleName);
          // connection.resume();
        });
      });
    })
    .on('end', function() {
      // all rows have been received
      connection.end();
    });



};

var Article = {
  get: function(db,name,callback) {
    var sql = ""+
      "SELECT * " +
      "FROM $db.revision r " +
      "INNER JOIN $db.version v ON v.name=r.version " +
      "WHERE articleName='$name' " +
      "ORDER BY v.rank DESC, r.datetime DESC " +
      "LIMIT 1";
    sql = sql.replace(/\$db/g , db);
    sql = sql.replace(/\$name/g , name.replace(/'/g,"''"));
    console.log('Article > get > SQL:\n',sql);
    connection.query(sql,function(err,rows,fields) {
      if (err) return console.error(err);
      try {
        var wikitext = rows[0]['body'];
        callback(null,wikitext);
      } catch(e) {
        console.error('Error parsing menu:',e);
        callback(e);
      }
    });
  }
}



go();

// connection&&connection.end&&connection.end();