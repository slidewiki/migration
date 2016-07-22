'use strict';

let mysql = require('mysql');
let mongoose = require('mongoose');
let async = require('async');

let UserSchema = require('./models/user.js');
let DeckSchema = require('./models/deck.js');

const User = mongoose.model('Users', UserSchema);
const Deck = mongoose.model('Decks', DeckSchema);

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

function deck_migration(con, callback){
  con.query('SELECT * FROM deck WHERE id = 3319', (err,rows) => {
    if(err) {
      return callback(err);
    }
    let mysql_decks = rows;

    async.each(mysql_decks, (mysql_deck, cbEach) => {
      async.waterfall([
        function saveDeck(cbAsync){
          let new_deck = new Deck({
            _id: mysql_deck.id,
            timestamp: mysql_deck.timestamp,
            user_id: mysql_deck.user_id,
            translated_from: mysql_deck.translated_from
          });
          new_deck.save((err, new_deck) => {
            if (err){
              console.log('Deck failed, id = ' + mysql_deck.id + ' error: ' + err);
              cbAsync(null, new_deck); //deck is not saved, but the migration continues
              //return;
            }
            if (new_deck._id){ //deck is saved
              console.log('Deck saved with id: ' + new_deck._id);
              cbAsync(null, new_deck);
            }
          });
        },
        function addRevisions(new_deck, cbAsync){
          con.query('SELECT * FROM deck_revision WHERE deck_id = ' + new_deck._id, (err,rows) => {
            if(err) {
              cbAsync(err);
            }else{
              console.log(rows);
              cbAsync(null, rows);
            }
          });
        }
      ],
      cbEach);
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
};

function user_migration(con, callback){
  con.query('SELECT * FROM users WHERE 1', (err,rows) => {
    if(err) {
      return callback(err);
    }
    let mysql_users = rows;

    let json_birthday = {};

    async.each(mysql_users, (mysql_user, callback) => {
      // Perform operation on user here.
      console.log('Processing user ' + mysql_user.id);
      if (mysql_user.birthday){
        let formatted_birthday = mysql_user.birthday.split('/');
        json_birthday = {month: formatted_birthday[0], day: formatted_birthday[1], year: formatted_birthday[2]};
      }
      let new_user = new User({
        _id: mysql_user.id,
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
        birthday: json_birthday,
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
      //migrate users
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
      function(callback){
        user_migration(con, (err) => {
          if (err) {
            callback(err);
            return;
          }
          console.log('Users are migrated');
          callback();
        });
      },
      //**********STEP2: migrate decks
      //try to empty deck collection; AFTER THAT
      //migrate deck, deck_revision, deck_content, collaborators, AFTER THAT
      //add decks into users.infodeck
      function(callback){
        try {
          mongoose.connection.db.dropCollection('decks');
        }
        catch(err) {
          callback(err);
          return;
        }
        console.log('Decks collection is dropped');
        callback();
      },
      //migrate decks
      function(callback){
        deck_migration(con, (err) => {
          if (err) {
            callback(err);
            return;
          }
          console.log('Decks are now migrated');
          callback();
        });
      }
    ],
    (err) => {
      if (err) {
        console.error(err.red);
        return;
      }
      console.log('Migration is successful');
      return;
    });


    //try to empty slides collection; AFTER THAT
    //migrate slides, slide_revision and collaborators
    //*********STEP3: add content to the decks
    //add content to the decks
    //*********STEP4: migrate media
    //try to empty media collection
    //migrate media table and media files
    //********STEP5: migrate questions
    //try to empty questions collection; AFTER THAT
    //migrate questions, answers and user testsbf
  }
});
