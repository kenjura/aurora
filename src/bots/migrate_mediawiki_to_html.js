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
  var example = 'example: node migrate_mediawiki_to_html.js wiki_oathkeep ~/oathkeep';
  var sourcedb = process.argv[2];
  if (!sourcedb) return console.error('Source DB required (arg 1). '+example);
  // var imageroot = process.argv[3];
  // if (!imageroot) return console.error('Image root required (arg 2). '+example);
  var dest = process.argv[3];
  if (!dest) return console.error('Destination required (arg 2). '+example);
  console.log('export.js > initialized. sourcedb=',sourcedb,' dest=',dest);

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
  const sql = `select page_title articleName, page_latest, convert(old_text using utf8) body from ${sourcedb}.page p
    inner join ${sourcedb}.revision r on r.rev_id = p.page_latest
    inner join ${sourcedb}.text t on r.rev_text_id = t.old_id;`
  const query = connection.query(sql);
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

      const articleName = row['articleName'].replace(/_/g, ' ');
      const filepath = articleName==='Main Page'
        ? `${path}/_home.txt`
        : `${path}/${articleName}.txt`;
      const body = row['body'];

      fs.writeFile(filepath, body, function(err){
        if (err) console.error('ERROR writing file. articleName=',articleName);
        else console.error(`Wrote article ${articleName} to path ${filepath}`);
        // connection.resume();
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