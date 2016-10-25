'use strict';

let mysql = require('mysql');
let mongoose = require('mongoose');
let async = require('async');
let he = require('he');



let Config = require('./config.js');
let co = require('./common.js');


const User = co.User;
const Deck = co.Deck;
const Slide = co.Slide;
const Counter = co.Counter;
// const DeckRevision = mongoose.model('DeckRevisions', DeckSchema.DeckRevision);

mongoose.Promise = global.Promise;

//connecting to mongoDB
mongoose.connect(Config.PathToMongoDB, (err) => {
    if (err) throw err;
    return;
});

console.log('fixing the database');


//connecting to mysql
const con = mysql.createConnection(Config.MysqlConnection);

//array of deck ids to migrate
//const DECKS_TO_MIGRATE = [27, 33, 584, 2838, 1265, 1112, 769, 805, 82, 220]; //if the array is not empty, the further parameters are ignored
// const DECKS_TO_MIGRATE = [1110];
// const DECKS_LIMIT = 500;
// const DECKS_OFFSET = 500;
// const ImageURI = 'localhost'; //for creating thumbnails
// const ImagePort = 8882; //for creating thumbnails


con.connect((err) => {
    if(err){
        return console.error('Error connecting to Database');
    }
    else { // here comes the migration
        async.series([
            fix_timestamp_type
        ],
        (err) => {
            if (err) {
                mongoose.connection.close();
                return console.error(err);
            }

            mongoose.connection.close();
            return console.log('Migration is successful');
        });
    }
});

function fix_timestamp_type(callback) {
    Deck.find({}, (err, decks) => {
        async.eachSeries(decks, (deck, cbEach) => {
            console.log(deck.timestamp);
            //deck.timestamp = new String(deck.timestamp);
            deck.timestamp = new Date(deck.timestamp).toISOString();
            deck.save(cbEach);
        }, () => {
            callback();
        });
    });
}
