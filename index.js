'use strict';

let mysql = require('mysql');
let mongoose = require('mongoose');
let async = require('async');
let he = require('he');


// let UserSchema = require('./models/user.js');
// let DeckSchema = require('./models/deck.js');
// let SlideSchema = require('./models/slide.js');
// let CounterSchema = require('./models/counters.js');
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

//connecting to mysql
const con = mysql.createConnection(Config.MysqlConnection);

//array of deck ids to migrate
//const DECKS_TO_MIGRATE = [27, 33, 584, 2838, 1265, 1112, 769, 805, 82, 220]; //if the array is not empty, the further parameters are ignored
const DECKS_TO_MIGRATE = [1110];
const DECKS_LIMIT = 500;
const DECKS_OFFSET = 500;
const ImageURI = 'localhost'; //for creating thumbnails
const ImagePort = 8882; //for creating thumbnails


// function uniq(a) {
//     var prims = {'boolean':{}, 'number':{}, 'string':{}}, objs = [];
//
//     return a.filter(function(item) {
//         var type = typeof item;
//         if(type in prims)
//             return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
//         else
//             return objs.indexOf(item) >= 0 ? false : objs.push(item);
//     });
// }



con.connect((err) => {
    if(err){
        return console.error('Error connecting to Database');
    }
    else { // here comes the migration
        async.series([
            drop_users, //try to empty users collection;
            migrate_users, //migrate users
            //drop_slides,
            //drop_decks, //try to empty deck collection; AFTER THAT
            //clean_usage, //if this is a second run
            //clean_contributors, //if this a second run
            //migrate_decks, //migrate deck, deck_revision, deck_content, collaborators, AFTER THAT
            //add_usage, //do it once after all decks have been migrated
            //format_contributors_slides, //do it once after all decks have been migrated
            //format_contributors_decks, //do it once after all decks have been migrated

            //add_translations_slides, //not implemented
            //add_translations_decks //not implemented
            //fill_infodecks//add decks into users.infodeck where necessary //not implemented

            //*********STEP4: migrate media
            //try to empty media collection //not implemented
            //migrate media table and media files //not implemented
            //********STEP5: migrate questions
            //try to empty questions collection; AFTER THAT //not implemented
            //migrate questions, answers and user testsbf //not implemented
            drop_counters,
            createCounters,
            //createThumbs,
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

function createThumbs(callback) {
    Slide.find({}, (err, slides) => {
        //console.log('slides found: ' + slides.length);
        async.eachSeries(slides, (slide, cbEach) => {
            createThumbnail(slide.revisions[slide.revisions.length-1].content, slide._id.toString(), slide.user.toString());
            cbEach();
        }, () => {
            callback();
        });
    });
}

function migrate_users(callback){
    con.query('SELECT * FROM users WHERE 1', (err, rows) => {
        if(err) {
            callback(err);
            return;
        }
        console.log('Starting migration of ' + rows.length + ' users');
        let mysql_users = rows;
        async.each(mysql_users, process_user, () => {
            console.log('Users are migrated');
            callback();
        });
    });
}

function migrate_decks(callback){
    let query = '';
    if (DECKS_TO_MIGRATE.length){
        async.eachOf(DECKS_TO_MIGRATE, (deck_id, key) => { //building a query for migrating several decks
            if (key){
                query += ' OR id = ' + deck_id;
            }else{
                query = 'id = ' + deck_id;
            }
        });
    }else {
        if (DECKS_LIMIT > 0) {
            query = '1' + ' LIMIT ' + DECKS_LIMIT; //get n first decks
            if (DECKS_OFFSET > 0){
                query+= ' OFFSET ' + DECKS_OFFSET;
            }
        }else{
            query = '1'; //get all decks
        }
    }

    con.query('SELECT * FROM deck WHERE ' + query, (err, rows) => {
        if(err) {
            console.log(err);
            callback(err);
            return;
        }else{
            let mysql_decks = rows;
            let count = mysql_decks.length;
            async.each(mysql_decks, (deck, cbEach) => {
                console.log('Adding deck ' + deck.id);
                process_deck(deck, () => {
                    count--;
                    console.log(count + ' decks left in stack');
                    cbEach();
                });
            }, callback);
        }
    });

    // con.query('SELECT * FROM deck WHERE id < 100', (err, rows) => {
    //     if(err) {
    //         console.log(err);
    //         callback(err);
    //         return;
    //     }else{
    //         let mysql_decks = rows;
    //         let count = mysql_decks.length;
    //         async.each(mysql_decks, (deck, cbEach) => {
    //             console.log('Adding deck ' + deck.id);
    //             process_deck(deck, cbEach);
    //         }, callback);
    //     }
    // });
}

function drop_users(callback){
    try {
        mongoose.connection.db.dropCollection('users').then(() => {
            console.log('Users collection is dropped');
            callback();
        });
    }
    catch(err) {
        console.log(err);
        callback();
        return;
    }

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

function format_contributors_slides(callback){
    console.log('Adding contributors for slides');
    Slide.find({}, (err, slides) => {
        let count = slides.length;
        async.each(slides, (slide, cbEach) => {
            if (slide.contributors.length){
                let formatted = [];
                async.each(slide.contributors, (contributor, cbEach2) => {
                    let found = formatted.find(x => x.user === contributor.user);
                    if (found){
                        found.count++;
                    }else{
                        formatted.push({user: contributor.user, count:1});
                    }
                    cbEach2();
                }, () => {
                    slide.contributors = formatted;
                    count--;
                    console.log('Slides in stack: ' + count);
                    slide.save(cbEach);
                });
            }else{
                count--;
                console.log('Slides in stack: ' + count);
                cbEach();
            }
        }, callback);
    });
}

function format_contributors_decks(callback){
    console.log('Adding contributors to decks');
    Deck.find({}, (err, decks) => {
        let count = decks.length;
        async.each(decks, (deck, cbEach) => {
            if (deck.contributors.length){
                let formatted = [];
                async.each(deck.contributors, (contributor, cbEach2) => {
                    let found = formatted.find(x => x.user === contributor.user);
                    if (found){
                        found.count++;
                    }else{
                        formatted.push({user: contributor.user, count:1});
                    }
                    cbEach2();
                }, () => {
                    deck.contributors = formatted;
                    count--;
                    console.log('Decks in stack: ' + count);
                    deck.save(cbEach);
                });
            }else{
                count--;
                console.log('Decks in stack: ' + count);
                cbEach();
            }
        }, callback);
    });
}

function process_deck(mysql_deck, callback){
    //console.log('Processing deck ' + mysql_deck.id);
    async.waterfall([
        // function getDeckCounter(cbAsync){
        //     Counter.findById('decks', (err, counter) => {
        //         let max_counter = 0;
        //         if (counter) {
        //             max_counter = counter.seq;
        //         }else{
        //             let counter1 = new Counter({
        //                 _id: 'decks',
        //                 field: '_id',
        //                 seq: 0
        //             });
        //             counter1.save((err, c1) => {
        //                 if (err) {
        //                     console.log('Counter of decks couldnt stored ' + counter1 + ' error: ' + err);
        //                     cbAsync(err, max_counter);
        //                 }
        //                 if (c1._id) {
        //                     console.log('Counter saved' + c1);
        //                     cbAsync(null, max_counter);
        //                 }
        //             });
        //         }
        //     });
        // },
        function saveDeck(cbAsync){
            let new_deck = new Deck({
                _id: mysql_deck.id,
                //mysql_id: mysql_deck.id,
                timestamp: mysql_deck.timestamp.toISOString(),
                user: mysql_deck.user_id,
                description: '',
                translation: [], //TODO
                lastUpdate: new Date().toISOString(), //TODO check all slides later in the code
                revisions: [],
                tags: [], //TODO collect from all revisions
                active: null,
                datasource: mysql_deck.description
            });
            new_deck.save((err, new_deck) => {
                if (err){
                    if (err.code === 11000){ //deck has already been processed
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
            con.query('SELECT * FROM deck_revision WHERE deck_id = ' + mysql_deck.id + ' ORDER BY timestamp', (err,rows) => {
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
        function countRevisions(mysql_revisions, cbAsync){ //adjusting revision ids to a new schema, adding language
            let processed = 0;
            mysql_revisions.forEach((revision, key, array) => {
                revision.mysql_id = revision.id;
                revision.id = key+1;
                revision._id = key+1;
                revision.language = mysql_deck.language;
                //if (revision.language === 'en') revision.language = 'gb';
                processed++;
                if (processed === array.length){
                    //console.log(mysql_revisions);
                    cbAsync(null, mysql_revisions);
                }
            });
        },
        function addRevisions(mysql_revisions, cbAsync){
            async.eachSeries(mysql_revisions, process_revision, cbAsync);
        }
    ], () => {
        callback();
    });
}


function process_content(html){
    let re = /<h2>(.*?)<\/h2>/ig; //for cutting a title
    let match, title = '';
    match = re.exec(html);
    //let content = html.match();
    if (match){
        title += match[1];
    }
    if (title === '') {
        title = 'No title';
    }
    //let re2 = /(<h2>)(.*?)(<\/h2>)(.*?)/ig;
    let content = html.replace('<h2>' + title + '</h2>', ''); //cutting a title
    content = content.replace(/.\/upload/g, 'http://slidewiki.org/upload'); //replace all occurences of media files with the correct absolute url
    return {content: content, title: title};
}


function processTags(revision, callback){
    let tags = [];
    con.query('SELECT * FROM tag WHERE item_type = "deck" AND item_id = ' + revision.mysql_id, (err,rows) => {
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
                //timestamp: mysql_slide.timestamp.toISOString(),
                user: mysql_slide.user_id,
                description: '',
                translation: [], //TODO
                contributors: [], //TODO
                tags: [],
                active: '',
                datasource: mysql_slide.description,
                lastUpdate: new Date().toISOString(),
                revisions: []
            });
            new_slide.save((err, new_slide) => {
                if (err){
                    if (err.code === 11000){ //slide has already been processed
                        //console.log('Slide exists with id' + mysql_slide.id);
                        callback();
                    }else{
                        console.log('Slide failed, id = ' + mysql_slide.id + ' error: ' + err);
                        cbAsync(null, new_slide); //deck is not saved, but the migration continues
                    }
                }else{
                    //console.log('Slide saved with id: ' + new_slide._id);
                    cbAsync(null, new_slide);
                }
            });
        },

        function getRevisions(new_slide, cbAsync){
            con.query('SELECT * FROM slide_revision WHERE slide = ' + new_slide._id + ' ORDER BY timestamp', (err,rows) => {
                if(err) {
                    cbAsync(err);
                }else{
                    cbAsync(null, rows);
                }
            });
        },
        function countRevisions(mysql_revisions, cbAsync){ //re-calculating the revisions and adding language
            let processed = 0;
            mysql_revisions.forEach((revision, key, array) => {
                revision.mysql_id = revision.id;
                revision.id = key+1;
                revision._id = key+1;
                revision.language = mysql_slide.language;
                processed++;
                if (processed === array.length){
                    cbAsync(null, mysql_revisions);
                }
            });
        },
        function addRevisions(mysql_revisions, cbAsync){
            async.eachSeries(mysql_revisions, process_revision, cbAsync);
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
                'WHERE item_type = "slide" AND item_id = ' + new_revision.mysql_id, (err, rows) => {
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
                'WHERE deck_content.item_type = "deck" AND deck_content.item_id = ' + new_revision.mysql_id, (err, rows) => {
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
                                            console.log('error of async for !!!!!!!!!!!!!!!!' + revision_type + new_revision.mysql_id + '-' + new_revision.id);
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
                }, cbAsync);
            }else{
                cbAsync();
            }
        }
    ], callback);
}

function convert_language(mysql_language) {
    let array = mysql_language.split('-');
    if (array.length){
        if (array[0] === 'en') return 'en_GB';
        return (array[0] + '_' + array[0].toUpperCase());
    }else{
        return ('en_GB');
    }
}

function process_revision(mysql_revision, callback){

    let language_code = 'en_GB';

    if (mysql_revision.language){
        language_code = convert_language(mysql_revision.language);
    }

    if (mysql_revision.slide){ //this is slide revision
        let new_revision = {
            _id: mysql_revision._id,
            id: mysql_revision.id,
            mysql_id: mysql_revision.mysql_id,
            user: mysql_revision.user_id,
            content: process_content(mysql_revision.content).content,
            title: process_content(mysql_revision.content).title,
            timestamp: mysql_revision.timestamp.toISOString(),
            speakernotes: mysql_revision.note,
            parent: {id: null, revision: mysql_revision.based_on}, //TODO
            language: language_code,
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
                Slide.findById(
                    mysql_revision.slide, (err, found) => {
                        let key = new_revision.id-1;
                        found.revisions[key] = new_revision;
                        found.contributors.push({user: new_revision.user});
                        found.active = new_revision.id;
                        found.save(cbAsync);
                    }
                );
            }
        ], callback);
    }else if (mysql_revision.deck_id){ //this is deck_revision
        console.log('Processing revision ' + mysql_revision.mysql_id);
        if (mysql_revision.title === ''){
            mysql_revision.title = 'No title';
        }
        let new_revision = {
            _id: mysql_revision._id,
            id: mysql_revision.id,
            mysql_id: mysql_revision.mysql_id,
            title: mysql_revision.title,
            timestamp: mysql_revision.timestamp.toISOString(),
            user: mysql_revision.user_id,
            parent: {id: null, revision: mysql_revision.based_on}, //TODO
            popularity: 0,
            license: 'CC BY-SA',
            isFeatured: mysql_revision.is_featured,
            priority: 0,
            visibility: mysql_revision.visibility,
            language: language_code,
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
                        console.log(err);
                        cbAsync();
                    }else{
                        new_revision.tags = tags;
                        cbAsync();
                    }
                });
            },
            function getRevisionContent(cbAsync){ //this should be a recursion
                con.query('SELECT * FROM deck_content WHERE item_id > 0 AND deck_revision_id = ' + mysql_revision.mysql_id, (err, rows) => {
                    if (err){

                        cbAsync(err, null);
                    } else{
                        //console.log('Revision content: ' + rows);
                        cbAsync(null, rows);
                    }
                });
            },
            function addItemIdsToContent(rows, cbAsync){
                async.eachOf(rows, (row, key, cbEach) => {
                    if (row.item_type === 'deck'){
                        if (row.item_id > 0){
                            con.query('SELECT deck_id FROM deck_revision WHERE id = ' + row.item_id, (err, id_row) => {
                                if (err){
                                    cbEach(err, null);
                                }else{
                                    if (id_row.length){
                                        row.item = '';
                                        row.item = id_row[0].deck_id;
                                        cbEach(null, rows);
                                    }else {
                                        console.log('deck failed: ' + row.item_id);
                                        row[key] = {};
                                        cbEach(null, rows);
                                    }
                                }
                            });
                        }else{
                            console.log('Adding item failed for deck_revision ' + row.deck_revision_id);
                            row[key] = {};
                            cbEach(null, rows);
                        }
                    }else if ((row.item_type === 'slide') && (row.item_id > 0)){
                        con.query('SELECT slide FROM slide_revision WHERE id = ' + row.item_id + ' LIMIT 1', (err, id_row) => {
                            if (err){
                                cbEach(err, null);
                            }else{
                                if (id_row.length){
                                    row.item = '';
                                    row.item = id_row[0].slide;
                                    cbEach(null, rows);
                                }else {
                                    console.log('slide failed: ' + row.item_id);
                                    row[key] = {};
                                    cbEach(null, rows);
                                }
                            }
                        });
                    } else{ //old database inconsistency
                        row[key] = {};
                        cbEach(null, rows);
                    }
                }, () => {
                    cbAsync(null, rows);
                });
            },
            //function which adds rows to new-revision
            function addContent(rows, cbAsync){
                async.each(rows, (row, cbEach) => {
                    if (row.item){
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
                                // if (row.item_type === 'deck'){
                                //     Deck.findOne({'_id' : row.item}, (err, found) => {
                                //         let revision = found.revisions.id(revision_number);
                                //         if (revision){
                                //             revision.usage.push(new_revision.id);
                                //             cbwaterfall();
                                //         } else{
                                //             console.log('Something wrong');
                                //             cbwaterfall();
                                //         }
                                //     });
                                // }else{
                                //     cbwaterfall();
                                // }
                            }
                        ], cbEach);
                    }else{ //adding item failed
                        cbEach();
                    }
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
                    } else if (item.kind === 'slide') {
                        con.query('SELECT * FROM slide WHERE id = ' + item.ref.id, (err, rows) => {
                            if (err){
                                cbEach(err);
                            } else{
                                process_slide(rows[0], cbEach);
                            }
                        });
                    } else{
                        cbEach();
                    }
                }, () => {
                    //console.log(new_revision);
                    cbAsync(null, new_revision);
                });
            },
            function saveRevisionToDeck(new_revision, cbAsync) {
                Deck.findById(
                    mysql_revision.deck_id, (err, found) => {
                        let key = new_revision.id-1;
                        found.revisions[key] = new_revision;
                        found.contributors.push({user: new_revision.user});
                        found.active = new_revision.id;
                        found.save(cbAsync);
                    }
                );
            }
        ], () => {
            callback();
        });
    } else{
        callback();
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
        frontendLanguage: 'en_GB', //will be default
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


function add_usage(callback){ //adds usage looking in the whole decks
    Deck.find({}, function(err, decks) {
        console.log('Starting to add usage');
        let count = decks.length;
        //console.log('FOUND ' + slides.length + 'slides++++++++++++++++++++++++++++++++++++++++++++++');
        async.each(decks, (deck, cbEach) => {
            //console.log('Adding usage for deck ' + deck.id);
            async.each(deck.revisions, (revision, cbEach2) => {
                async.each(revision.contentItems, (item, cbEach3) => {
                    if (item.kind === 'deck'){
                        //console.log(item);
                        Deck.findById(item.ref.id, (err, found) => {
                            //if (err) console.log(err);
                            if (found){
                                //console.log('found.revisions');
                                let item_revision = found.revisions.id(item.ref.revision);
                                if (item_revision){
                                    item_revision.usage.push({id : deck._id , revision: revision.id});
                                    //console.log('Usage added for deck ' + found._id + '-' + item_revision.id);
                                    console.log('Finished for a subdeck');
                                    found.save(cbEach3);
                                    //cbEach3();
                                }else{
                                    console.log('I could not find revision with id ' + item.ref.revision + ' for deck with id ' + item.ref.id);
                                    //console.log(found.revisions);
                                    console.log('Something is wrong with adding usage of deck '+ found.id + ' into deck ' + deck.id + '-' + revision.id);
                                    cbEach3();
                                }
                            }else{
                                console.log('not found deck with id ' + item.ref.id);
                                cbEach3();
                            }
                            // l
                        });
                    }else if (item.kind === 'slide'){ //this is slide item
                        Slide.findById(item.ref.id, (err, found) => {
                            //if (err) console.log(err);
                            if (found){
                                //console.log('found.revisions');
                                let item_revision = found.revisions.id(item.ref.revision);
                                if (item_revision){
                                    item_revision.usage.push({id : deck._id , revision: revision.id});
                                    //console.log('Usage added for slide ' + found._id + '-' + item_revision.id);
                                    console.log('Finished for a slide');
                                    found.save(cbEach3);
                                    //cbEach3();
                                }else{
                                    console.log('I could not find revision with id ' + item.ref.revision + ' for slide with id ' + item.ref.id);
                                    console.log('Something is wrong with adding usage of slide '+ found.id + ' into deck ' + deck.id + '-' + revision.id);
                                    cbEach3();
                                }
                            }else{
                                console.log('Not found slide with id ' + item.ref.id);
                                cbEach3();
                            }
                        });
                    }else{
                        console.log('Item kind is neither slide or deck');
                        cbEach3();
                    }
                }, () => {
                    //console.log(count + ' decks without usage left in stack');
                    console.log('Finished for that revision');
                    cbEach2();
                });
            }, () => {
                count--;
                console.log(count + ' decks without usage left in stack');
                cbEach();
            });
        },() => {
            console.log('Adding usage is finished');
            callback();
        } );
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

function drop_counters(callback) {
    try {
        mongoose.connection.db.dropCollection('counters');
    } catch (err) {
        callback(err);
        return;
    }
    console.log('Counters collection was dropped');
    callback();
}

function createThumbnail(slideContent, slideId, user) {
    let http = require('http');

    let encodedContent = he.encode(slideContent, {allowUnsafeSymbols: true});

    let jsonData = {
        userID: String(user),
        html: encodedContent,
        filename: slideId
    };

    let data = JSON.stringify(jsonData);
    console.log(data);

    let options = {
        host: ImageURI,
        port: ImagePort,
        path: '/thumbnail',
        method: 'POST',
        headers : {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Content-Length': data.length
        }
    };
    let req = http.request(options, (res) => {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
        // //    console.log('Response: ', chunk);
        // // let newDeckTreeNode = JSON.parse(chunk);
        //
        // // resolve(newDeckTreeNode);
        });
    });
    req.on('error', (e) => {
        console.log('problem with request thumb: ' + e.message);
        // reject(e);
    });
    req.write(data);
    req.end();
}

function createCounters(callback0) {
    con.query('select max(u.id)+1 as userid, max(d.id)+1 as deckid, max(s.id)+1 as slideid from users u, deck d, slide s;', (err, rows) => {
        if (err) {
            console.log(err);
            callback0(err);
            return;
        } else {
            async.series([
                    (callback1) => {
                        let counter1 = new Counter({
                            _id: 'users',
                            field: '_id',
                            seq: rows[0].userid
                        });
                        counter1.save((err, c1) => {
                            if (err) {
                                console.log('Counter of users couldnt stored' + counter1 + ' error: ' + err);
                                callback1(err, null);
                                return;
                            }
                            if (c1._id) {
                                console.log('Counter saved' + c1);
                                callback1(null, c1);
                                return;
                            }
                            console.log('saving counters - doing something strange!', err, counter1);
                        });
                    },
                    (callback2) => {
                        let counter2 = new Counter({
                            _id: 'decks',
                            field: '_id',
                            seq: rows[0].deckid
                        });
                        counter2.save((err, c2) => {
                            if (err) {
                                console.log('Counter of users couldnt stored' + counter2 + ' error: ' + err);
                                callback2(err, null);
                                return;
                            }
                            if (c2._id) {
                                console.log('Counter saved' + c2);
                                callback2(null, c2);
                                return;
                            }
                            console.log('saving counters - doing something strange!', err, counter2);
                        });
                    },
                    (callback3) => {
                        let counter3 = new Counter({
                            _id: 'slides',
                            field: '_id',
                            seq: rows[0].slideid
                        });
                        counter3.save((err, c3) => {
                            if (err) {
                                console.log('Counter of users couldnt stored' + counter3 + ' error: ' + err);
                                callback3(err, null);
                                return;
                            }
                            if (c3._id) {
                                console.log('Counter saved' + c3);
                                callback3(null, c3);
                                return;
                            }
                            console.log('saving counters - doing something strange!', err, counter3);
                        });
                    },
                ],
                // optional callback
                (err, results) => {
                    callback0();
                });
        }
    });
}
