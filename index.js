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
    //console.log('Processing deck ' + mysql_deck.id);
    async.waterfall([
        function saveDeck(cbAsync){
            let new_deck = new Deck({
                _id: mysql_deck.id,
                timestamp: mysql_deck.timestamp,
                user: mysql_deck.user_id,
                description: '',
                translation: [], //TODO
                //translated_from: mysql_deck.translated_from, //TODO do not need it here
                lastUpdate: Date.now, //TODO check all slides later in the code
                revisions: [],
                tags: [], //TODO
                active: null,
                datasource: mysql_deck.description
            });

            new_deck.save((err, new_deck) => {
                if (err){
                    if (err.code === 11000){ //deck has already been processed
                        console.log('Deck exists with id' + mysql_deck.id);
                        cbAsync(err, null);
                    }else{
                        console.log('Deck failed, id = ' + mysql_deck.id + ' error: ' + err);
                        cbAsync(err, new_deck); //deck is not saved, but the migration continues
                    }
                }else{
                    //console.log('Deck saved with id: ' + new_deck._id);
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
        //console.log('Deck saved with id: ' + mysql_deck.id);
        //add_usage_deck(mysql_deck.id, callback);
        //processed_decks.push(mysql_deck.id);
        callback();
    });
}

function processTags(revision, callback){
    let tags = [];
    con.query('SELECT * FROM tag WHERE item_type = "deck" AND item_id = ' + revision._id, (err,rows) => {
        if(err) {
            callback(err, tags);
        }else{
            async.each(rows, (tag_row, cbEach) => {
                //console.log(tag_row.tag);
                tags.push(tag_row.tag);
                cbEach();
            }, () => {
                callback(null, tags);
            });
        }
    });
}
function process_slide(mysql_slide, callback){
    async.waterfall([
        function saveSlide(cbAsync){
            let new_slide = new Slide({
                _id: mysql_slide.id,
                timestamp: mysql_slide.timestamp,
                user: mysql_slide.user_id,
                description: '',
                translation: [], //TODO
                contributors: [], //TODO
                tags: [],
                active: '',
                datasource: mysql_slide.description,
                lastUpdate: Date.now,
                revisions: []
            });
            new_slide.save((err, new_slide) => {
                if (err){
                    if (err.code === 11000){ //slide has already been processed
                        //console.log('Slide exists with id' + mysql_slide.id);
                        callback();
                    }else{
                        //console.log('Slide failed, id = ' + mysql_slide.id + ' error: ' + err);
                        cbAsync(null, new_slide); //deck is not saved, but the migration continues
                    }
                }else{
                    //console.log('Slide saved with id: ' + new_slide._id);
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
        callback();
    });
}

function buildTranslatedFrom(new_revision, revision_type, callback){
    let source = {
        id: null,
        revision: null
    };
    if (new_revision.translated_from.source.revision){
        console.log('ADD TRANSLATION FOR SLIDE ' + new_revision.id);
        if (revision_type === 'slide'){
            con.query('SELECT slide.* FROM slide INNER JOIN slide_revision ON slide_revision.slide = slide.id WHERE slide_revision.id = ' + new_revision.translated_from.source.revision, (err, rows) => {
                if (err) {
                    callback(err, source);
                } else {
                    if (rows.length){
                        async.waterfall([
                            function addSlideTranslatedFrom(cbAsync){
                                process_slide(rows[0], cbAsync);
                            },
                            function AddRevisionToSource(cbAsync){
                                source.id = rows[0].id;
                                Slide.findOne({'_id' : rows[0].id}, (err, found) => {
                                    let revision = found.revisions.id(new_revision.translated_from.source.revision);
                                    if (revision){
                                        source.revision = revision.id;
                                    } else{
                                        source.revision = 1;
                                    }
                                    cbAsync(null, source);
                                });
                            }
                        ], (err, source) => {
                            callback(err, source);
                        });
                    } else {
                        callback(null, source);
                    }
                }
            });
        } else {
            con.query('SELECT deck.* FROM deck JOIN deck_revision ON deck_revision.deck_id = deck.id WHERE deck_revision.id = ' + new_revision.translated_from.source.revision, (err, rows) => {
                if (err) {
                    callback(err, source);
                } else {
                    async.waterfall([
                        function addDecksToUsage(cbAsync){
                            process_deck(rows[0], cbAsync);
                        },

                        function AddRevisionToUsage(cbAsync){
                            source.id = rows[0].id;
                            Deck.findOne({'_id' : rows[0].id}, (err, found) => {
                                let revision = found.revisions.id(new_revision.translated_from.source.revision);
                                if (revision){
                                    source.revision = revision.id;
                                } else{
                                    //source.revision = 1;
                                    console.log('REVISION ERROR');
                                }
                                cbAsync(null, source);
                            });
                        }
                    ], (err, source) => {
                        callback(err, source);
                    });
                }
            });
        }
    } else {
        callback(null, source);
    }
}

function collectUsage(new_revision, revision_type, callback){
    async.waterfall([
        function getDecks(cbAsync){
            if (revision_type === 'slide'){
                //console.log('adding usage for slide ' + new_revision._id);
                con.query('SELECT deck_revision.deck_id AS deck_id, deck_content.deck_revision_id AS revision_id ' +
                'FROM deck_content LEFT JOIN deck_revision ON deck_revision.id = deck_content.deck_revision_id ' +
                'WHERE item_type = "slide" AND item_id = ' + new_revision._id, (err, rows) => {
                    if (err) {
                        cbAsync(err, null);
                    } else {
                        //console.log('The slide is used in ' + rows.length + ' decks');
                        cbAsync(null, rows);
                    }
                });
            } else {
                con.query('SELECT deck_revision.deck_id AS deck_id, deck_content.deck_revision_id AS revision_id ' +
                'FROM deck_content LEFT JOIN deck_revision ON deck_revision.id = deck_content.deck_revision_id ' +
                'WHERE deck_content.item_type = "deck" AND deck_content.item_id = ' + new_revision._id, (err, rows) => {
                    if (err) {

                        cbAsync(err, null);
                    } else {

                        cbAsync(null, rows);
                    }
                });
            }
        },
        function processDecks(rows, cbAsync){
            if (rows){
                async.each(rows, (row, cbEach) => {
                    let usage = {};
                    con.query('SELECT * FROM deck WHERE id = ' + row.deck_id, (err, deck_rows) => {
                        if (err) {
                            console.log(err);
                            cbEach();
                        }else{
                            async.waterfall([
                                function addDecksToUsage(cbWF){
                                    process_deck(deck_rows[0], cbWF);
                                },
                                function AddRevisionToUsage(cbWF){
                                    Deck.findOne({'_id' : row.deck_id}, (err, found) => {
                                        usage.id = row.deck_id;
                                        let revision = found.revisions.id(row.revision_id);
                                        if (revision){
                                            usage.revision = revision.id;
                                        } else{
                                            console.log('error of async for !!!!!!!!!!!!!!!!' + revision_type + new_revision._id + '-' + new_revision.id);
                                            //usage.revision = 1;
                                        }
                                        //console.log('USAGE: ' +usage);
                                        cbWF();
                                    });
                                }
                            ], () => {
                                new_revision.usage.push(usage);
                                //new_revision.type = null;
                                cbEach();
                            });
                        }
                    });
                }, () => {
                    cbAsync(null, new_revision);
                } );
            }else{
                cbAsync(null, new_revision);
            }
        }
    ], (err, new_revision) => {
        //console.log('ERRROR:' + err + 'NEW_REV: ' + new_revision);
        callback(err, new_revision);
    });
}

function process_revision(mysql_revision, callback){
    if (mysql_revision.slide){ //this is slide revision
        let new_revision = {
            _id: mysql_revision._id,
            id: mysql_revision.id,
            user: mysql_revision.user_id,
            content: process_content(mysql_revision.content).content,
            title: process_content(mysql_revision.content).title,
            timestamp: mysql_revision.timestamp,
            speakernotes: mysql_revision.note,
            parent: {id: mysql_revision._id, revision: mysql_revision.based_on},
            comment: mysql_revision.comment,
            tags: [],
            license: 'CC BY-SA',
            translated_from: {status: mysql_revision.translation_status, source: {id: null, revision: mysql_revision.translated_from_revision}, translator: {id: mysql_revision.translator_id, username: null}}, //TODO
            media: [], //TODO - if we store them here
            datasources: [],
            usage: [],
        };
        async.waterfall([
            // function getTranslatedFrom(cbAsync){
            //     buildTranslatedFrom(mysql_revision, 'slide', cbAsync);
            // },
            // function addTranslationSource(source, cbAsync){
            //     new_revision.translated_from.source = source;
            //     cbAsync();
            // },
            // function getUsage(cbAsync){
            //     collectUsage(new_revision, 'slide', cbAsync);
            // },
            function saveRevisionToslide(cbAsync){
                Slide.findByIdAndUpdate(
                    mysql_revision.slide,
                    {$push: {'revisions': new_revision}, 'active' : new_revision.id},
                    {safe: false, upsert: false},
                    cbAsync
                );
            }
        ], (err, new_revision) => {
            if (err) callback(err);
            //console.log('Deck revision saved with id ' + mysql_revision.id + ' for deck ' + mysql_revision.deck_id );
            callback(null, new_revision);
        });

    }else{ //this is deck_revision
        let new_revision = {
            _id: mysql_revision._id,
            id: mysql_revision.id,
            title: mysql_revision.title,
            timestamp: mysql_revision.timestamp,
            user: mysql_revision.user_id,
            parent: {id: mysql_revision._id, revision: mysql_revision.based_on},
            popularity: 0,
            license: 'CC BY-SA',
            isFeatured: mysql_revision.is_featured,
            priority: 0,
            visibility: mysql_revision.visibility,
            language: mysql_revision.language,
            translated_from: {status: mysql_revision.translation_status, source: {id: null, revision: mysql_revision.translated_from_revision}, translator: {id: null, username: null}},
            tags: [],
            preferences: [],
            contentItems: [],
            datasources: [], //TODO
            usage: []
        };
        async.waterfall([
            // function getTranslatedFrom(cbAsync){
            //     buildTranslatedFrom(mysql_revision, 'deck', cbAsync);
            // },
            // function addTranslationSource(source, cbAsync){
            //     new_revision.translated_from.source = source;
            //     cbAsync();
            // },
            // function getUsage(cbAsync){
            //     collectUsage(new_revision, 'deck', cbAsync);
            // },
            function addTags(cbAsync){
                processTags(mysql_revision, (err, tags) => {
                    if (err) {
                        //console.log(err);
                        cbAsync();
                    }else{
                        new_revision.tags = tags;
                        cbAsync();
                    }
                });
            },
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
                        function getrevisionnumber(cbwaterfall){ //counts a new revision number
                            if (row.item_type==='slide'){
                                con.query('SELECT RowNumber FROM (SELECT @row_num := IF(@row_num=NULL,1,@row_num+1) AS RowNumber ,id ,timestamp FROM slide_revision, (SELECT @row_num := 0) x WHERE slide = '
                                + row.item +
                                ' ORDER BY timestamp ASC ) AS t WHERE t.id = '
                                + row.item_id, (err, rank_rows) => {
                                    if (err) {
                                        cbwaterfall(err);
                                    }else{
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
                                process_deck(rows[0], () => {
                                    cbEach();
                                });
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
            if (err) {
                console.log(err);
                callback(err);
            }
            else
            //console.log('Deck revision saved with id ' + mysql_revision.id + ' for deck ' + mysql_revision.deck_id );
            callback(null, new_revision);
        });
    }
}


function process_user(mysql_user, callback){
    //console.log('Processing user ' + mysql_user.id);
    let new_user = new User({
        _id: mysql_user.id,
        username: mysql_user.username,
        email: mysql_user.email,
        password: mysql_user.password,
        defaults: {},
        registered: mysql_user.registered,
        surname: mysql_user.last_name,
        forename: mysql_user.first_name,
        country: mysql_user.location,
        spokenLanguages: {},
        frontendLanguage: 'en_EN', //will be default
        picture: mysql_user.picture,
        interests: '',
        description: mysql_user.description,
        birthday: '',
        infodeck: '',
        organization: ''
    });
    new_user.save((err, new_user) => {
        if (err){
            //console.log('User failed, id = ' + mysql_user.id + ' error: ' + err);
            callback(err); //user is not saved, but the migration continues
            return;
        }
        if (new_user._id){ //user is saved
            //console.log('User saved with id: ' + new_user._id);
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
    con.query('SELECT * FROM deck WHERE id = 33', (err, rows) => {
        if(err) {
            console.log(err);
            callback(err);
            return;
        }else{
            let mysql_decks = rows;
            async.each(mysql_decks, (deck, cbEach) => {
                console.log('Adding deck ' + deck.id);
                process_deck(deck, () => {
                    cbEach();
                });
            }, callback);
        }
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

function add_usage_slides(callback){ //adds usage for all slides
    Slide.find({}, function(err, slides) {
        console.log('FOUND ' + slides.length + 'slides++++++++++++++++++++++++++++++++++++++++++++++');
        async.each(slides, (slide, cbEach) => {
            async.each(slide.revisions, (revision, cbEach2) => {
                collectUsage(revision, 'slide', (err, new_revision) => {
                    slide.save(cbEach2);
                } );
            }, cbEach);
        }, callback);
    });
}

function add_translations_slides(callback){ //adds translations for all slides presented
    Slide.find({}, function(err, slides) {
        async.each(slides, (slide, cbEach) => {
            async.each(slide.revisions, (revision, cbEach2) => {
                buildTranslatedFrom(revision, 'slide', (err, source) => {
                    revision.source = source;
                    slide.save(cbEach2);
                } );
            }, cbEach);
        }, callback);
    });
}

function add_usage_deck(callback){ //adds usage for all decks
    Deck.find({}, function(err, decks) {
        console.log('FOUND ' + decks.length + 'decks++++++++++++++++++++++++++++++++++++++++++++++');
        async.each(decks, (deck, cbEach) => {
            async.each(deck.revisions, (revision, cbEach2) => {
                collectUsage(revision, 'deck', (err, new_revision) => {
                    deck.save(cbEach2);
                } );
            }, cbEach);
        }, callback);
    });
}

con.connect((err) => {
    if(err){
        return console.error('Error connecting to Database');
    }
    else { // here comes the migration
        async.waterfall([
            //drop_users, //try to empty users collection;
            //migrate_users, //migrate users
            drop_slides,
            drop_decks, //try to empty deck collection; AFTER THAT
            migrate_decks, //migrate deck, deck_revision, deck_content, collaborators, AFTER THAT
            //add_usage_slides,
            //add_usage_decks,
            //add_translations_slides,
            //add_translations_decks
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
