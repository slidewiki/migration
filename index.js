'use strict';

let mysql = require('mysql');
let mongoose = require('mongoose');
let async = require('async');

let UserSchema = require('./models/user.js');

mongoose.connect('mongodb://localhost');

let mongo = mongoose.connection;
mongo.on('error', console.error.bind(console, 'connection error:'));
mongo.once('open', () => {
  console.log('mongodb connected!');
});

const con = mysql.createConnection({
  host: 'localhost',
  user: 'slidewiki',
  password: 'sw123',
  database: 'slidewikiold'
});

function user_migration(con, callback){
  con.query('SELECT * FROM users WHERE 1', (err,rows) => {
    if(err) {
      return callback(err);
    }
    let mysql_users = rows;
    let User = mongoose.model('Users', UserSchema);

    async.each(mysql_users, (mysql_user, callback) => {
      // Perform operation on user here.
      console.log('Processing user ' + mysql_user.id);
      // try {
      let new_user = new User({
        username: mysql_user.username,
        email: mysql_user.email,
        password: mysql_user.password,
        surname: mysql_user.last_name,
        forename: mysql_user.first_name,
        gender: mysql_user.gender,
        hometown: mysql_user.hometown,
        location: mysql_user.location,
        picture: mysql_user.picture,
        description: mysql_user.description,
        birthday_mysql: mysql_user.birthday,
        infodeck_mysqlid: mysql_user.infodeck
      });
      new_user.save((err, new_user) => {
        if (err){
          console.log('User failed, id = ' + mysql_user.id + ' error: ' + err);
          callback(); //user is not saved, but the migration continues
          return;
        }
        if (new_user._id){ //user is saved
          //console.log('User saved with id: ' + new_user._id);
          callback();
        }
      });
      // }
      // catch (err){
      //   callback();
      //   return;
      // }
    }, (err) => {
      // if any of the user processing produced an error (other then user saving error, which we ignore), err would equal that error
      if ( err ) {
      // One of the iterations produced an error.
      // All processing will now stop.
        return callback(err);
      } else {
        return callback();
      }
    });
  });
}

con.connect((err) => {
  if(err){
    return console.error('Error connecting to Database');;
  }
  else { // here comes the migration
    async.series([
      //*******STEP1: migrate users
      //try to empty users collection; AFTER THAT
      function(callback){
        try {
          mongoose.connection.db.dropCollection('users');
        }
        catch(err) {
          callback(err);
          return;
        }
        console.log('Users collection is dropped');
        callback();
      },
      //migrate users
      function(callback){
        user_migration(con, (err) => {
          if (err) {
            callback(err);
            return;
          }
          callback();
        });
      }
    ],
    (err) => {
      if (err) {
        throw err;
      }
      console.log('Users are now migrated');
    });

    //**********STEP2: paralell to slides and decks**********************
    //try to empty deck collection; AFTER THAT
    //migrate deck, deck_revision, collaborators, AFTER THAT
    //add decks into users.infodeck
    //try to empty slides collection; AFTER THAT
    //migrate slides, slide_revision and collaborators
    //*********STEP3: add content to the decks
    //add content to the decks
    //*********STEP4: migrate media
    //try to empty media collection
    //migrate media table and media files
    //********STEP5: migrate questions
    //try to empty questions collection; AFTER THAT
    //migrate questions, answers and user tests
  }
});
