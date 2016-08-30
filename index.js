'use strict';

let mysql = require('mysql');
let mongoose = require('mongoose');
let async = require('async');


let UserSchema = require('./models/user.js');
let DeckSchema = require('./models/deck.js');
let SlideSchema = require('./models/slide.js');


const User = mongoose.model('Users', UserSchema);
const Deck = mongoose.model('Decks', DeckSchema.DeckSchema);
const Slide = mongoose.model('Slides', SlideSchema.SlideSchema);
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

function process_content(html){
    let re = /<h2>(.*?)<\/h2>/ig;
    let match, title = '';
    match = re.exec(html);
    //let content = html.match();
    if (match){
        title += match[1];
    }
    //let re2 = /(<h2>)(.*?)(<\/h2>)(.*?)/ig;
    let content = html.replace('<h2>' + title + '</h2>', '');
    return {content: content, title: title};
}

function process_deck(mysql_deck, callback){
    console.log('Processing deck ' + mysql_deck.id);
    async.waterfall([
        function saveDeck(cbAsync){
            let new_deck = new Deck({
                _id: mysql_deck.id,
                timestamp: mysql_deck.timestamp,
                user: mysql_deck.user_id,
                translated_from: mysql_deck.translated_from
            });

            new_deck.save((err, new_deck) => {
                if (err){
                    if (err.code === 11000){ //deck has already been processed
                        console.log('Deck exists with id' + mysql_deck.id);
                        callback();
                    }else{
                        console.log('Deck failed, id = ' + mysql_deck.id + ' error: ' + err);
                        cbAsync(null, new_deck); //deck is not saved, but the migration continues
                    }
                }else{
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
                    if (rows.length > 100){
                        let new_rows = [];
                        new_rows[0] = rows[0];
                        rows = new_rows;
                    }
                    cbAsync(null, rows);
                }
            });
        },
        function countRevisions(mysql_revisions, cbAsync){
            async.eachOf(mysql_revisions, (revision, key, cbEachOf) => {
                revision._id = revision.id;
                revision.id = key+1;
                return cbEachOf();
            }, () => {
                cbAsync(null, mysql_revisions);
            });
        },
        function addRevisions(mysql_revisions, cbAsync){
            async.each(mysql_revisions, process_revision, cbAsync);
        }
    ], () => {
        console.log('Deck saved with id: ' + mysql_deck.id);
        callback();
    });
}

function process_slide(mysql_slide, callback){
    console.log('Processing slide ' + mysql_slide.id);
    async.waterfall([
        function saveSlide(cbAsync){
            let new_slide = new Slide({
                _id: mysql_slide.id,
                timestamp: mysql_slide.timestamp,
                user: mysql_slide.user_id
            });
            new_slide.save((err, new_slide) => {
                if (err){
                    if (err.code === 11000){ //slide has already been processed
                        console.log('Slide exists with id' + mysql_slide.id);
                        callback();
                    }else{
                        console.log('Slide failed, id = ' + mysql_slide.id + ' error: ' + err);
                        cbAsync(null, new_slide); //deck is not saved, but the migration continues
                    }
                }else{
                    console.log('Slide saved with id: ' + new_slide._id);
                    cbAsync(null, new_slide);
                }
            });
        },
        function getRevisions(new_slide, cbAsync){
            con.query('SELECT * FROM slide_revision WHERE slide = ' + new_slide._id, (err,rows) => {
                if(err) {
                    cbAsync(err);
                }else{
                    cbAsync(null, rows);
                }
            });
        },
        function countRevisions(mysql_revisions, cbAsync){
            async.eachOf(mysql_revisions, (revision, key, cbEachOf) => {
                revision._id = revision.id;
                revision.id = key+1;
                return cbEachOf();
            }, () => {
                cbAsync(null, mysql_revisions);
            });
        },
        function addRevisions(mysql_revisions, cbAsync){
            async.each(mysql_revisions, process_revision, cbAsync);
        }
    ], () => {
        console.log('Slide saved with id: ' + mysql_slide.id);
        callback();
    });
}



function process_revision(mysql_revision, callback){
    if (mysql_revision.slide){
        console.log('Processing slide revision ' + mysql_revision._id);
        let new_revision = {
            _id: mysql_revision._id,
            id: mysql_revision.id,
            user: mysql_revision.user_id,
            content: process_content(mysql_revision.content).content,
            title: process_content(mysql_revision.content).title
        };
        Slide.findByIdAndUpdate(
            mysql_revision.slide,
            {$push: {'revisions': new_revision}, 'active' : new_revision.id},
            {safe: false, upsert: false},
            (err, new_revision) => {
                if (err) callback(err);
                console.log('Slide revision saved with id ' + mysql_revision.id + ' for slide ' + mysql_revision.slide );
                callback(null, new_revision);
            }
        );
    }else{
        let new_revision = {
            _id: mysql_revision._id,
            id: mysql_revision.id,
            title: mysql_revision.title,
            user: mysql_revision.user_id,
            contentItems: []
        };
        async.waterfall([
            function getRevisionContent(cbAsync){ //this should be a recursion
                con.query('SELECT * FROM deck_content WHERE deck_revision_id = ' + mysql_revision._id, (err, rows) => {
                    if (err){
                        cbAsync(err, null);
                    } else{
                        cbAsync(null, rows);
                    }
                });
            },
            function addItemIdsToContent(rows, cbAsync){
                async.each(rows, (row, cbEach) => {
                    if (row.item_type === 'deck'){
                        con.query('SELECT deck_id FROM deck_revision WHERE id = ' + row.item_id, (err, id_row) => {
                            if (err){
                                cbEach(err, null);
                            }else{
                                //console.log('ID_ROW:' + id_row);
                                row.item = '';
                                row.item = id_row[0].deck_id;
                                cbEach();
                            }
                        });
                    }else{
                        con.query('SELECT slide FROM slide_revision WHERE id = ' + row.item_id + ' LIMIT 1', (err, id_row) => {
                            if (err){
                                //console.log(err);
                                cbEach(err, null);
                            }else{                      //console.log('ID_ROW:' + id_row);
                                row.item = '';
                                row.item = id_row[0].slide;
                                cbEach();
                            }
                        });
                    }
                }, () => {
                    cbAsync(null, rows);
                });
            },
            //function which adds rows to new-revision
            function addContent(rows, cbAsync){
                async.each(rows, (row, cbEach) => {
                    async.waterfall([
                        function getrevisionnumber(cbwaterfall){
                            let revision_number = 1;
                            if (row.item_type==='slide'){
                                con.query('SELECT RowNumber FROM (SELECT @row_num := IF(@row_num=NULL,1,@row_num+1) AS RowNumber ,id ,timestamp FROM slide_revision, (SELECT @row_num := 0) x WHERE slide = '
                                + row.item +
                                ' ORDER BY timestamp ASC ) AS t WHERE t.id = '
                                + row.item_id, (err, rank_rows) => {
                                    if (err) {
                                        cbwaterfall(err);
                                    }else{
                                        console.log('RANK::::::' + rank_rows[0].RowNumber);
                                        cbwaterfall(null, rank_rows[0].RowNumber);
                                    }
                                });

                            }else{
                                con.query('SELECT RowNumber FROM (SELECT @row_num := IF(@row_num=NULL,1,@row_num+1) AS RowNumber ,id ,timestamp FROM deck_revision, (SELECT @row_num := 0) x WHERE deck_id = '
                                + row.item +
                                ' ORDER BY timestamp ASC ) AS t WHERE t.id = '
                                + row.item_id, (err, rank_rows) => {
                                    if (err) {
                                        cbwaterfall(err);
                                    }else{
                                        console.log('RANK::::::' + rank_rows[0].RowNumber);
                                        cbwaterfall(null, rank_rows[0].RowNumber);
                                    }
                                });

                            }
                        },
                        function buildContentItem(revision_number, cbwaterfall){
                            new_revision.contentItems.push({
                                order: row.position,
                                kind: row.item_type,
                                ref: {
                                    id: row.item,
                                    revision: revision_number
                                }
                            });
                            cbwaterfall();
                        }
                    ], () => {
                        cbEach();
                    });
                }, () => {
                    cbAsync(null, new_revision);
                });
            },
            function processContent(new_revision, cbAsync){
                async.each(new_revision.contentItems, (item, cbEach) => {
                    if (item.kind === 'deck'){
                        //get a deck for the sub-deck revision and process it
                        con.query('SELECT * FROM deck WHERE id = ' + item.ref.id, (err, rows) => {
                            if (err){
                                cbEach(err);
                            } else{
                                process_deck(rows[0], cbEach);
                            }
                        });
                    }else{
                        con.query('SELECT * FROM slide WHERE id = ' + item.ref.id, (err, rows) => {
                            if (err){
                                cbEach(err);
                            } else{
                                process_slide(rows[0], cbEach);
                            }
                        });
                    }
                }, () => {
                    cbAsync(null, new_revision);
                });
            },
            function saveRevisionToDeck(new_revision, cbAsync) {
                Deck.findByIdAndUpdate(
                    mysql_revision.deck_id,
                    {$push: {'revisions': new_revision} , 'active' : new_revision.id},
                    {safe: false, upsert: false},
                    cbAsync
                );
            },
        ], (err, new_revision) => {
            if (err) callback(err);
            console.log('Deck revision saved with id ' + mysql_revision.id + ' for deck ' + mysql_revision.deck_id );
            callback(null, new_revision);
        });
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
    con.query('SELECT * FROM deck WHERE id = 1298', (err, rows) => {
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
            //drop_users, //try to empty users collection;
            //migrate_users, //migrate users
            drop_slides,
            drop_decks, //try to empty deck collection; AFTER THAT
            migrate_decks, //migrate deck, deck_revision, deck_content, collaborators, AFTER THAT
            //fill_infodecks//add decks into users.infodeck where necessary //as there are only two users with infodeck added, skip this
            //drop_slides,//try to empty slides collection; AFTER THAT
            //migrate_slides //slide_revision and collaborators


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
