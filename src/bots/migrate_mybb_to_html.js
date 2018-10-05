require('dotenv').config({path: '/etc/aurora.env'});

const express = require('express');
const mysql   = require('mysql');
const _       = require('lodash');

const app = express();

app.get('/', (req, res) => {

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const pass = process.env.MYSQL_PASS;
  const db = process.env.MYSQL_DB;

  const connection = mysql.createConnection({
    host,
    user,
    password,
    database,
  });

  connection.connect();

  const query = `SELECT p.*, f.name
  FROM mybb_posts p
  LEFT JOIN mybb_forums f ON f.fid = p.fid
  LIMIT 30`;

  console.log('sending query...');

  connection.query(query, (err, data, fields) => {
    if (err) die(err);
    const threaded = _.groupBy(data, 'tid');
    console.log(threaded);
    res.send(render(threaded));
  });

  connection.end();
});

app.listen(3030, err => console.log('app is running on port 3030'));

function die(err) {
  console.error(err);
  process.exit();
}

function render(threaded) {
  return `<html>
    <head>
      <style>
        body {
          background-color: #eee;
          font-family: sans-serif;
        }

        .thread {
          background-color: white;
          box-shadow: 0 0 5px 5px rgba(0,0,0,0.2);
          margin: 20px;
          padding: 20px;
        }

        .post {
          border-top: 2px solid #444;
          margin-top: 20px;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      ${_.values(threaded).map(thread => `<div class="thread">
        <h1>${thread[0].subject}</h1>
        ${thread.map(post => `<div class="post">
            <h3>${post.username} ${(new Date(post.dateline*1000)).toLocaleString()}</h3>
            <pre>${post.message}</pre>
          </div>`)}
      </div>`).join('')}
    </body>
  </html>`;
}