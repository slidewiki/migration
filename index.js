'use strict';

let mysql = require('mysql');
let mongoose = require('mongoose');
let async = require('async');


let UserSchema = require('./models/user.js');
let DeckSchema = require('./models/deck.js');


const User = mongoose.model('Users', UserSchema);
const Deck = mongoose.model('Decks', DeckSchema.DeckSchema);
// const DeckRevision = mongoose.model('DeckRevisions', DeckSchema.DeckRevision);

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://0.0.0.0:27018/slidewiki');

let mongo = mongoose.connection;
mongo.on('error', () => {
    console.error.bind(console, 'connection error:');
    return;
});
// mongo.once('open', () => {
//   console.log('mongodb connected!');
// });

const con = mysql.createConnection({
    user: 'slidewiki',
    password: 'sw123',
    database: 'slidewiki'
});

// function addRevisions(revisions, callback){
//   async.each(revisions, (revision, final_object) => {
//     if (revision.slide) { //this is slide revision
//       Slide.findById(revision.slide, (err, slide) => {
//         console.log(slide);
//         return;
//       });
//     }else{ //this is deck revision
//       return;
//     }
//   }, callback);
// };



// function addContent(mysql_content, cb_async){
//   async.each(mysql_content, (mysql_item, final_object) => {
//
//     if (mysql_content.item_type === 'deck'){ //getting subdecks
//
//     }else{ //todo
//
//     }
//   }, cbAsync(null, new_deck));
// }
//])

function process_deck(mysql_deck, callback){
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
        function getRevisions(new_deck, cbAsync){
            con.query('SELECT * FROM deck_revision WHERE deck_id = ' + new_deck._id, (err,rows) => {
                if(err) {
                    cbAsync(err);
                }else{
                    console.log(rows);
                    cbAsync(null, rows);
                }
            });
        },
        function addRevisions(mysql_revisions, cbAsync){
            async.each(mysql_revisions, process_deck_revision, cbAsync);
        }
    ],
    callback);
}

function process_deck_revision(mysql_revision, callback){

    if (mysql_revision.deck_id) { //this is deck revision
        let new_revision = {
            _id: mysql_revision.id,
            title: mysql_revision.title
        };

        async.waterfall([

            function getRevisionContent(cbAsync){ //this should be a recursion
                con.query('SELECT * FROM deck_content WHERE deck_revision_id = ' + new_revision._id, (err, rows) => {
                    if (err){
                        cbAsync(err, null);
                    } else{
                        cbAsync(null, rows);
                    }
                });
            },
            //todo function which recursively adds rows to new-revision
            function(rows, cbAsync){
                cbAsync(null, new_revision);
            },
            function(new_revision, cbAsync) {
                Deck.findByIdAndUpdate(
                    mysql_revision.deck_id,
                    {$push: {'revisions': new_revision}},
                    {safe: false, upsert: false},
                    cbAsync

                );
            },

        ], callback
    );
    }else{ //this is slide revision
        return;
    }
}


function process_user(mysql_user, callback){
    console.log('Processing user ' + mysql_user.id);
    let json_birthday = {};
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
            console.log('User saved with id: ' + new_user._id);
            callback();
        }
    });
}

function migrate_users(callback){
    con.query('SELECT * FROM users WHERE 1', (err, rows) => {
        if(err) {
            callback(err);
            return;
        }
        let mysql_users = rows;
        async.each(mysql_users, process_user, callback);
    });
}

function migrate_decks(callback){
    con.query('SELECT * FROM deck WHERE id = 28', (err, rows) => {
        if(err) {
            console.log(err);
            callback();
            return;
        }
        let mysql_decks = rows;
        async.each(mysql_decks, process_deck, callback);
    });
}

function drop_users(callback){
    try {
        mongoose.connection.db.dropCollection('users');
    }
    catch(err) {
        callback(err);
        return;
    }
    console.log('Users collection is dropped');
    callback();
}

function drop_decks(callback){
    try {
        mongoose.connection.db.dropCollection('decks');
    }
    catch(err) {
        callback(err);
        return;
    }
    console.log('Decks collection is dropped');
    callback();
}

function drop_slides(callback){
    try {
        mongoose.connection.db.dropCollection('slides');
    }
    catch(err) {
        callback(err);
        return;
    }
    console.log('Slides collection is dropped');
    callback();
}
//
// function fill_infodecks(callback){
//
// //   User.find({ 'infodeck_mysqlid': {$ne: null} }, (err, docs) => {
// // //  User.find({ 'username': 'ali1k' }, (err, docs) => {
// //     console.log(docs);
// //     callback();
// //
// //   });
// }
// // //migrate decks


con.connect((err) => {
    if(err){
        return console.error('Error connecting to Database');
    }
    else { // here comes the migration
        async.series([
            drop_users, //try to empty users collection;
            migrate_users, //migrate users
            drop_decks, //try to empty deck collection; AFTER THAT
            migrate_decks, //migrate deck, deck_revision, deck_content, collaborators, AFTER THAT
            //fill_infodecks//add decks into users.infodeck where necessary //as there are only two users with infodeck added, skip this
            //drop_slides,//try to empty slides collection; AFTER THAT
            //migrate_slides //slide_revision and collaborators
            //*********STEP3: add content to the decks
            //add content to the decks
            //*********STEP4: migrate media
            //try to empty media collection
            //migrate media table and media files
            //********STEP5: migrate questions
            //try to empty questions collection; AFTER THAT
            //migrate questions, answers and user testsbf
        ],
        (err) => {
            if (err) {
                console.error(err);
                mongoose.connection.close();
                return;
            }
            console.log('Migration is successful');
            mongoose.connection.close();
            return;
        });
    }
});
