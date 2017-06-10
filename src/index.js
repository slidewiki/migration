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
let fix_user = require('./fix_user.js').migrate_usernames;

const User = co.User;
const Deck = co.Deck;
const Slide = co.Slide;
const Counter = co.Counter;
const Activity = co.Activity;
const Comment = co.Comment;
const Notification = co.Notification;
const RevisionsTable = co.RevisionsTable;

mongoose.Promise = global.Promise;

//connecting to mongoDB
mongoose.connect(Config.PathToMongoDB, (err) => {
    if (err) {
        console.error('Error connecting to MongoDB');
        throw err;
        return -1;
   }
});


//connecting to mysql
const con = mysql.createConnection(Config.MysqlConnection);

//array of deck ids to migrate
//const DECKS_TO_MIGRATE = [2838, 2846, 3841]; //if the array is not empty, the further parameters are ignored
//const DECKS_TO_MIGRATE = [584, 2926];
const FILTER_SPAM_QUERY = "(SELECT deck_id FROM `deck_revision` WHERE `user_id` < 3891 AND (`user_id` NOT BETWEEN 1594 AND 1711) " +
" AND (`user_id` NOT BETWEEN 1462 AND 1569) AND `user_id` NOT IN (160, 1048, 1162, 1306, 1323, 1637, 1706, 1722, 1749, 1877," +
" 1879, 1958, 2019, 2064, 2068, 2085, 2087, 2100, 2152, 2167, 2193, 2213, 2329, 2313, 2339, 2348, 2501, 2510, 2523, 2524, 2540," +
" 2546, 2593, 2602, 2603, 2610, 2627, 2634, 2653, 2655, 2671, 2694, 2707, 2756, 2777, 2819, 2843, 2873, 2877, 2882, 2896, 2904, " +
" 2926, 2942, 2973, 2976, 2980, 2985, 3021, 3062, 3063, 3064, 3076,  3091, 3101, 3102, 3103, 3124, 3181, 3190, 3200, 3213, 3224, " +
" 3240, 3242, 3246, 3247, 3248, 3251, 3263, 3274, 3275, 3277, 3278, 3280, 3290, 3302, 3304, 3306, 3313,  3322, 3327,  3328, 3349, " +
" 3370, 3387, 3408, 3412, 3416, 3420, 3423, 3431, 3433, 3437, 3442, 3448, 3453, 3459, 3461, 3464, 3490, 3492, 3495, 3497, 3500, 3513, " +
" 3517, 3519, 3520, 3523, 3525, 3527, 3533, 3538, 3549, 3552, 3560, 3565, 3585, 3601, 3620, 3622, 3635, 3650, 3656, 3634, 3657, 3673, " +
" 3675, 3676, 3684, 3686, 3721, 3723, 3727, 3742, 3744, 3750, 3764, 3765, 3770, 3775, 3728, 3798, 3781, 3786, 3788, 3789, 3795, 3808, " +
" 3810, 3819, 3832,3833, 3835, 3838, 3839, 3823, 3841, 3844, 3848, 3847, 3850, 3852, 3854, 3859, 3867, 3868, 3873, 3874, 3876, 3877, " +
" 3878, 3879  ) AND `title` NOT LIKE '%Google%' AND title NOT LIKE '%facebook%' AND `title` NOT LIKE '%password%' " +
" AND `title` NOT LIKE '%Call%' AND `title` NOT LIKE '%phone%' AND `title` NOT LIKE '%+91%' AND `title` NOT LIKE '%1-888%' " +
" AND `title` NOT LIKE '%+%' AND `title` NOT LIKE '%payPal%' AND `title` NOT LIKE '%Yahoo%' AND `title` NOT LIKE '%Quickbooks%' " +
" AND `title` NOT LIKE '%Visa%' AND `title` NOT LIKE '%Mesothelioma%' AND `title` NOT LIKE '%Hotmail%' AND `title` NOT LIKE '%1800-721%' " +
" AND `title` NOT LIKE '%0537%' AND `title` NOT LIKE '%1-8%' AND `title` NOT LIKE '%1844%' AND `title` NOT LIKE '%steering%' " +
" AND `title` NOT LIKE '%Gmail%' AND `title` NOT LIKE '%Slide 1%' AND `title` NOT LIKE '%Outlook%' AND `title` NOT LIKE '%online photography%' " +
" AND `title` NOT LIKE '%photography online%' AND `title` NOT LIKE '%bright circle%' AND `title` NOT LIKE '%Ayurveda%' " +
" AND `title` NOT LIKE '%Quicken%' AND `title` NOT LIKE '%hotamil%' AND `title` NOT LIKE '%Homework help%' AND `title` NOT LIKE '%Black magic%'" +
" AND `title` NOT LIKE '%tarot card%' AND `title` NOT LIKE '%taxi%' AND `title` NOT LIKE '%1800-8%' AND `title` NOT LIKE '%Vastu%' " +
" AND `title` NOT LIKE '%971%' AND `title` NOT LIKE '%1800-%' AND `title` NOT LIKE '%877-%' AND `title` NOT LIKE '%mcAffee%' " +
" AND `title` NOT LIKE '%escorts%' AND `title` NOT LIKE '%paintings online%' AND `title` NOT LIKE '%customer service%' " +
" AND `title` NOT LIKE '%vashikaran%' AND `title` NOT LIKE '%support number%' AND `title` NOT LIKE '%1855%' AND `title` NOT LIKE '%buy online%' " +
" AND `title` NOT LIKE '%Ayurvedic%' AND `title` NOT LIKE '%855%' AND `title` NOT LIKE '%astrology%' AND `title` NOT LIKE '%baba%' " +
" AND `title` NOT LIKE '%917%' AND `title` NOT LIKE '%India%' AND `title` NOT LIKE '%Delhi%' AND `title` NOT LIKE '%laptop%' " +
" AND `title` NOT LIKE '%dentist%' AND `title` NOT LIKE '%tantra%' AND `title` NOT LIKE '%love%' AND `title` NOT LIKE '%kaal%' " +
" AND `title` NOT LIKE '%marriage%' AND `title` NOT LIKE '%mcafee%' AND `title` NOT LIKE '%quickbook%' AND `abstract` NOT LIKE '%quickbook%' " +
" AND `abstract` NOT LIKE '%+%' AND `abstract` NOT LIKE '%1-8%' AND `abstract` NOT LIKE '%0800%' AND `title` NOT LIKE '%0800%' " +
" AND `title` NOT LIKE '%astrolog%' AND `abstract` NOT LIKE '%astrolog%' AND `title` NOT LIKE '%http%' AND `title` NOT LIKE '%escort%' " +
" AND `title` NOT LIKE '%bangalore%' AND `title` NOT LIKE '%chandigarth%' AND `title` NOT LIKE '%virgin%' AND `title` NOT LIKE '%844%' " +
" AND `title` NOT LIKE '%24/7%' AND `abstract` NOT LIKE '%24/7%' AND `title` NOT LIKE '%0532%' AND `abstract` NOT LIKE '%0532%' GROUP BY deck_id)"

const DECKS_TO_MIGRATE = [];
const DECKS_LIMIT = 0;
const DECKS_OFFSET = 0;
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
        console.error('Error connecting to MySQL Database');
        if (err) throw err;
        return -2;
    }
    else { // here comes the migration
        con.query('set session sql_mode=\'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION\';', (err, rows) => {
            if(err){
                throw err;
                return -3;
            }
        });
        con.query('set global sql_mode=\'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION\';', (err, rows) => {
            if(err){
                throw err;
                return -3;
            }
        });
        async.series([
            //drop_users, //try to empty users collection;
            migrate_users, //migrate users
            //drop_slides,

            //drop_decks, //try to empty deck collection; AFTER THAT
            //clean_contributors, //if this a second run
            //remove_usage,
            migrate_decks, //migrate deck, deck_revision, deck_content, collaborators, AFTER THAT

            add_usage_handler, //do it once after all decks have been migrated
            format_contributors_slides, //do it once after all decks have been migrated
            format_contributors_decks, //do it once after all decks have been migrated

            fix_origin_slides, //build origins using new revision numbers instead of old ones
            fix_origin_decks, //build origins using new revision numbers instead of old ones

            drop_counters,
            createCounters,
            fix_user,
            //adjust_model_decks //in development
            //createThumbs,
        ],
        (err) => {
            if (err) {
                mongoose.connection.close();
                console.error(err);
                process.exit(0);
            }

            mongoose.connection.close();
            console.log('Migration is successful');
            process.exit(0);
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
            console.log(err);
            callback(err);
            return;
        }
        console.log('Starting migration of ' + rows.length + ' users');
        let mysql_users = rows;
        async.eachSeries(mysql_users, process_user, () => {
            console.log('Users are migrated');
            callback();
        });
    });
}

// function adjust_model_decks(callback){
//     Deck.find({}, (err, decks)=> {
//         async.each(decks, (deck, cbEach) => {
//             deck.accessLevel = null;
//             if (deck.origin){
//                 deck.translated_from = {'status': 'google'};
//             }else{
//                 deck.translated_from = {'status': 'original'};
//             }
//             deck.save(cbEach);
//         }, callback);
//
//     });
// }

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
            query = 'id IN' + FILTER_SPAM_QUERY + ' LIMIT ' + DECKS_LIMIT; //get n first decks
            if (DECKS_OFFSET > 0){
                query+= ' OFFSET ' + DECKS_OFFSET;
            }
        }else if (DECKS_OFFSET > 0){
            query = 'id IN' + FILTER_SPAM_QUERY + ' LIMIT 10000 OFFSET ' + DECKS_OFFSET;
        }else{
            query = 'id IN' + FILTER_SPAM_QUERY; //get all decks
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
            async.eachSeries(mysql_decks, (deck, cbEach) => {
                if (deck.id < 1701 || deck.id > 1725){ //filtering big meaningless decks
                    console.log('Adding deck ' + deck.id);
                    process_deck(deck, (err) => {
                        if (err) {
                            console.log('Error in migrating deck ' + deck.id);
                            count--;
                            console.log(count + ' decks left in stack');
                            cbEach();
                        }else{
                            count--;
                            console.log(count + ' decks left in stack');
                            cbEach();
                        }
                    });
                }else{
                    count--;
                    console.log(count + ' decks left in stack');
                    cbEach();
                }
            }, callback);
        }
    });

}

function drop_users(callback){
    try {
        mongoose.connection.db.dropCollection('users');
    }
    catch(err) {
        console.log(err);
        callback();
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

function fix_origin_decks(callback){
    console.log('Changing decks origins');
    let count = 0;
    Deck.find({'origin': {$exists:true}}, (err, decks) => {
        count = decks.length;
        console.log('left in stack: ' + count);
        async.each(decks, (this_deck, cbEach) => {
            if (this_deck.origin.mysql_revision){
                Deck.findById(this_deck.origin.id, (err, origin_deck) => {
                    if (origin_deck){
                        async.each(origin_deck.revisions, (revision, cbEach2) => {
                            if (revision.mysql_id === this_deck.origin.mysql_revision) {
                                this_deck.origin.revision = revision.id;
                                this_deck.origin.user = revision.user;
                                this_deck.save(cbEach2);
                            } else{
                                cbEach2();
                            }
                        }, () => {
                            count--;
                            console.log('left in stack: ' + count);
                            cbEach();
                        });
                    }else{
                        this_deck.origin = {};
                        count--;
                        cbEach();
                    }

                });
            }else{
                count--;
                console.log('left in stack: ' + count);
                cbEach();
            }
        }, () => {
            console.log('Decks origins are fixed') ;
            callback();
        });
    });
}

function fix_origin_slides(callback){
    console.log('Changing slides origins');
    let count = 0;
    Slide.find({'origin': {$exists:true}}, (err, slides) => {
        count = slides.length;
        console.log('left in stack: ' + count);
        async.each(slides, (this_slide, cbEach) => {
            if (this_slide.origin.mysql_revision){
                Slide.findById(this_slide.origin.id, (err, origin_slide) => {
                    if (origin_slide){
                        async.each(origin_slide.revisions, (revision, cbEach2) => {
                            if (revision.mysql_id === this_slide.origin.mysql_revision) {
                                this_slide.origin.revision = revision.id;
                                this_slide.origin.user = revision.user;
                                this_slide.save(cbEach2);
                            } else{
                                cbEach2();
                            }
                        }, () => {
                            count--;
                            console.log('left in stack: ' + count);
                            cbEach();
                        });
                    }else{
                        //console.log(this_slide);
                        this_slide.origin = {};
                        this_slide.save(cbEach);
                    }

                });
            }else{
                count--;
                console.log('left in stack: ' + count);
                cbEach();
            }
        }, () => {
            console.log('Slides origins are fixed') ;
            callback();
        });
    });
}

function format_contributors_slides(callback){
    console.log('Adding contributors for slides');
    Slide.find({}, (err, slides) => {
        let count = slides.length;
        async.eachSeries(slides, (slide, cbEach) => {
            if (slide.contributors.length){
                let formatted = [];
                async.eachSeries(slide.contributors, (contributor, cbEach2) => {
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
                    slide.save( (err) => {
                        if (err) {
                            console.log(err);
                        }else{
                            cbEach();
                        }
                    });
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
        async.eachSeries(decks, (deck, cbEach) => {
            if (deck.contributors.length){
                let formatted = [];
                async.eachSeries(deck.contributors, (contributor, cbEach2) => {
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
                    deck.save( (err) => {
                        if (err) {
                            console.log(err);
                            console.log('deck_id: ' + deck._id);
                        }else{
                            cbEach();
                        }
                    });
                });
            }else{
                count--;
                console.log('Decks in stack: ' + count);
                cbEach();
            }
        }, callback);
    });
}

function buildOrigin(mysql_deck, callback){
    let origin = {};
    if (mysql_deck.translated_from){
        console.log('im inside');
        con.query('SELECT * FROM deck_revision WHERE id =' + mysql_deck.translated_from_revision, (err, rows) => {
            if(err) {
                console.log(err);
                return err;
            }else{
                console.log(rows);
                origin = {'id' : mysql_deck.translated_from};
                // origin.mysql_revision = mysql_deck.translated_from_revision;
                // origin.revision = 1;
                // origin.user = rows[0].user_id;
                // origin.title = rows[0].title;
                console.log('ORIGIN FROM FUNCTION: ' +JSON.stringify(origin));
                callback(origin);
            }

        });
    }else{
        callback(origin);
    }

}

function process_deck(mysql_deck, callback){
    //console.log('Processing deck ' + mysql_deck.id);
    if (mysql_deck.id >= 1701 && mysql_deck.id <=1725){
        console.log('aaaaaaaaaaaaaaaaaaaaaaa');
        callback();
    }
    let new_deck = new Deck({
        _id: mysql_deck.id,
        //mysql_id: mysql_deck.id,
        timestamp: mysql_deck.timestamp.toISOString(),
        user: mysql_deck.user_id,
        description: '',
        translations: [], //TODO
        origin: {},
        lastUpdate: new Date().toISOString(), //TODO check all slides later in the code
        revisions: [],
        tags: [], //TODO collect from all revisions
        active: null,
        datasource: mysql_deck.description,
        license: 'CC BY-SA',
    });
    async.waterfall([
        function buildOrigin(cbAsync){
            if (mysql_deck.translated_from){
                console.log('Adding origin');
                con.query('SELECT * FROM deck_revision WHERE id =' + mysql_deck.translated_from_revision, (err, rows) => {
                    if(err) {
                        console.log(err);
                        cbAsync(err);
                    }else {
                        new_deck.origin.id = mysql_deck.translated_from;
                        new_deck.origin.mysql_revision = mysql_deck.translated_from_revision;
                        new_deck.origin.revision = 1;
                        new_deck.origin.user = rows[0].user_id;
                        new_deck.origin.title = rows[0].title;
                        //console.log('ORIGIN FROM FUNCTION: ' +JSON.stringify(new_deck.origin));
                        cbAsync();
                    }
                });
            }else{
                cbAsync();
            }
        },
        function getRevisions(cbAsync){
            console.log('Getting revisions');
            //con.query('SELECT * FROM deck_revision WHERE deck_id = ' + mysql_deck.id + ' ORDER BY timestamp DESC ', (err,rows) => {
            con.query('SELECT * FROM ' +
            '(SELECT * FROM deck_revision ' +
             'INNER JOIN deck_content ON deck_revision.id = deck_content.deck_revision_id ' +
             'WHERE deck_id = ' + mysql_deck.id +
             ' GROUP BY id ORDER BY timestamp DESC LIMIT 50) AS t1 ORDER BY timestamp ASC', (err,rows) => {
                if(err) {
                    console.log(err);
                    cbAsync(err, rows);
                }else{
                    cbAsync(null, rows);
                }
            });
        },
        function buildRevisionTable(mysql_revisions, cbAsync){
            console.log('Filling revisions table');
            let processed = 0;
            if (!mysql_revisions.length){
                callback(true);
            }else{
                mysql_revisions.forEach((revision, key, array) => {
                    let revisions_row = new RevisionsTable({
                        _id: revision.id,
                        deck_id: mysql_deck.id,
                        user_id: revision.user_id
                    });
                    revisions_row.save((err) => {
                        if (!err || err.code === 11000) {
                            if (err){
                                console.log('The revision ' + revision.id +' is already there');
                            }
                            processed++;
                            if (processed === array.length){
                                cbAsync(null, mysql_revisions);
                            }
                        }else{
                            console.log(err);

                        }
                    });

                });
            }


        },
        function countRevisions(mysql_revisions, cbAsync){ //adjusting revision ids to a new schema, adding language
            console.log('Count revisions');
            let processed = 0;
            mysql_revisions.forEach((revision, key, array) => {
                revision.mysql_id = revision.id;
                revision.id = key+1;
                revision._id = key+1;
                revision.language = mysql_deck.language;
                //if (revision.language === 'en') revision.language = 'gb';
                processed++;
                if (processed === array.length){
                    cbAsync(null, mysql_revisions);
                }
            });
        },
        function addRevisions(mysql_revisions, cbAsync){
            console.log('Adding revisions');
            async.eachSeries(mysql_revisions, ((mysql_revision, cbEach) => {
                process_revision(mysql_revision, (err, new_revision) => {
                    if (err) {
                        console.log(err);
                        cbEach();
                    } else{
                        let key = new_revision.id-1;
                        new_deck.revisions[key] = new_revision;
                        new_deck.contributors.push({user: new_revision.user});
                        new_deck.active = new_revision.id;
                        cbEach();
                    }
                });
            }), () => {
                new_deck.save((err, new_deck) => {
                    if (err){
                        if (err.code === 11000){ //deck has already been processed
                            cbAsync(null, new_deck);
                            // new_deck.save((err, new_deck) => {
                            //     if (err) {
                            //         console.log('Deck failed, id = ' + mysql_deck.id + ' error: ' + err);
                            //         cbAsync(err, new_deck); //deck is not saved, but the migration continues
                            //     }else{
                            //         cbAsync(null, new_deck);
                            //     }
                            // });
                        }else{
                            console.log('Deck failed, id = ' + mysql_deck.id + ' error: ' + err);
                            cbAsync(err, new_deck); //deck is not saved, but the migration continues
                        }
                    }else{
                        console.log('Success');
                        cbAsync(null, new_deck);
                    }
                });

            });
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
    let content = html.replace('<h2>' + title + '</h2>', '<h3>' + title + '</h3>'); //cutting a title
    content = content.replace(/.\/upload/g, 'http://slidewiki.org/upload'); //replace all occurences of media files with the correct absolute url
    return {content: content, title: title};
}


function processTags(revision, callback){
    let tags = [];
    con.query('SELECT * FROM tag WHERE item_type = "deck" AND item_id = ' + revision.mysql_id, (err,rows) => {
        if(err) {
            callback(err, tags);
        }else{
            async.eachSeries(rows, (tag_row, cbEach) => {
                //console.log(tag_row.tag);
                tags.push({'tagName': tag_row.tag});
                cbEach();
            }, () => {
                callback(null, tags);
            });
        }
    });
}

function process_slide(mysql_slide, callback){
    mysql_slide.origin = {};
    async.waterfall([
        function buildOrigin(cbAsync){
            if (mysql_slide.translated_from){
                con.query('SELECT * FROM slide_revision WHERE id =' + mysql_slide.translated_from_revision, (err, rows) => {
                    if(err) {
                        console.log(err);
                        //cbAsync(err);
                    }else if (rows.length){
                        mysql_slide.origin.id = mysql_slide.translated_from;
                        mysql_slide.origin.mysql_revision = mysql_slide.translated_from_revision;
                        mysql_slide.origin.revision = 1;
                        mysql_slide.origin.user = rows[0].user_id;
                        mysql_slide.origin.title = rows[0].title;
                        cbAsync();
                    }else{
                        con.query('SELECT * FROM slide_revision WHERE slide=' + mysql_slide.translated_from, (err, rows) => {
                            if (err){
                                console.log(err);
                            }else if (rows.length){
                                mysql_slide.origin.id = rows[0].id;
                                mysql_slide.origin.revision = 1;
                                mysql_slide.origin.user = rows[0].user_id;
                                mysql_slide.origin.title = rows[0].title;
                                cbAsync();
                            }else {
                                cbAsync();
                            }
                        })
                    }
                });
            }else{
                cbAsync();
            }
        },
        function getRevisions(cbAsync){
            con.query('SELECT * FROM slide_revision WHERE slide = ' + mysql_slide.id + ' ORDER BY timestamp', (err,rows) => {
                if(err) {
                    cbAsync(err);
                }else{
                    mysql_slide.timestamp = rows[0].timestamp.toISOString();
                    cbAsync(null, rows);
                }
            });
        },
        function saveSlide(rows, cbAsync){
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
                revisions: [],
                timestamp: mysql_slide.timestamp,
                license: 'CC BY-SA',
                origin: mysql_slide.origin
            });
            new_slide.save((err) => {
                if (err){
                    if (err.code === 11000){ //slide already exists, ids conflict
                        Slide.findOne({_id : new_slide._id}, (err, found) => {
                            if (err) {
                                console.log(err);
                            }else{
                                //console.log(found.revisions);
                                if (!found) {
                                    console.log('aaaaaaa');
                                    console.log(new_slide._id);
                                }else{
                                    if (found.revisions.length){ //the slide was migrated from old slidewiki - it is the same slide
                                        if (found.revisions[0].mysql_id){
                                            callback();
                                        } else{ //ids conflict
                                            Counter.findOne({_id: 'slides'}, (err, slides_counter) => {
                                                slides_counter.seq++;
                                                slides_counter.save();
                                                let new_slide_content = found.toObject();
                                                delete new_slide_content._v;
                                                new_slide_content._id = slides_counter.seq;
                                                let new_old_slide = new Slide(new_slide_content);
                                                new_old_slide.save((err) => {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        async.eachSeries(found.revisions, (revision, cbEach) => {
                                                            async.eachSeries(revision.usage, (usage, cbEach2) => {
                                                                Deck.findOne({_id: usage.id}, (err, deck) => {
                                                                    async.eachSeries(deck.revisions[usage.revision-1].contentItems, (item, cbEach3) => {
                                                                        if (item.kind === 'slide' && item.ref.id === new_slide._id){
                                                                            item.ref.id = slides_counter.seq;
                                                                            cbEach3();
                                                                        }else{
                                                                            cbEach3();
                                                                        }
                                                                    }, () => {
                                                                        deck.save(cbEach2);
                                                                    });
                                                                });
                                                            }, () => {
                                                                cbEach();
                                                            });
                                                        }, () => {
                                                            // async.Series([
                                                            //     (callback) => {
                                                            //         Activity.find({content_id: new_slide.id, content_kind: 'slide'}, (err, founds) => {
                                                            //             async.eachSeries(founds, (found, cbEach) => {
                                                            //                 found.content_id = new_old_slide._id;
                                                            //                 found.save(cbEach);
                                                            //             }, () => {
                                                            //                 callback();
                                                            //             });
                                                            //         });
                                                            //     },
                                                            //     (callback) => {
                                                            //         Comment.find({content_id: new_slide.id, content_kind: 'slide'}, (err, founds) => {
                                                            //             async.eachSeries(founds, (found, cbEach) => {
                                                            //                 found.content_id = new_old_slide._id;
                                                            //                 found.save(cbEach);
                                                            //             }, () => {
                                                            //                 callback();
                                                            //             });
                                                            //         });
                                                            //     },
                                                            //     (callback) => {
                                                            //         Notification.find({content_id: new_slide.id, content_kind: 'slide'}, (err, founds) => {
                                                            //             async.eachSeries(founds, (found, cbEach) => {
                                                            //                 found.content_id = new_old_slide._id;
                                                            //                 found.save(cbEach);
                                                            //             }, () => {
                                                            //                 callback();
                                                            //             });
                                                            //         });
                                                            //     }
                                                            // ],
                                                            //     () => {
                                                                    Slide.remove({_id: new_slide.id}, (err, removed) => {
                                                                        new_slide.save((err) => {
                                                                            if (err) {
                                                                                if (err.code === 11000){
                                                                                    console.log('STILLLBAAAAD');
                                                                                    //callback();
                                                                                }else{
                                                                                    console.log('Slide failed, id = ' + new_slide._id + ' error: ' + err);
                                                                                    callback(err); //slide has been processed
                                                                                }
                                                                            }else{
                                                                                cbAsync(null, rows);
                                                                            }
                                                                        });
                                                                    });
                                                                // }
                                                            // );

                                                        });
                                                    }
                                                });
                                            });

                                        }
                                    }else{
                                        callback();
                                    }
                                }

                            }

                        });

                    }else{
                        console.log('Slide failed very badly, id = ' + mysql_slide.id + ' error: ' + err);
                        callback(); //deck is not saved, but the migration continues
                    }
                }else{
                    //console.log('Slide saved with id: ' + new_slide._id);
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
                revision.dataSources = [];
                if (mysql_slide.description){
                    if (mysql_slide.description.substr(0, 4) === 'http'){
                        revision.dataSources.push({type: 'webpage', title: mysql_slide.description , url: mysql_slide.description, comment: '', authors: ''});
                    }else{
                        revision.dataSources.push({type: 'plaintext', title: mysql_slide.description, url: '', comment: '', authors: ''});
                    }
                }
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

// function buildTranslatedFrom(new_revision, revision_type, callback){
//     let source = {
//         id: null,
//         revision: null
//     };
//     if (new_revision.translated_from.source.revision){
//         console.log('ADD TRANSLATION FOR SLIDE ' + new_revision.id);
//         if (revision_type === 'slide'){
//             con.query('SELECT slide.* FROM slide INNER JOIN slide_revision ON slide_revision.slide = slide.id WHERE slide_revision.id = ' + new_revision.translated_from.source.revision, (err, rows) => {
//                 if (err) {
//                     callback(err, source);
//                 } else {
//                     if (rows.length){
//                         async.waterfall([
//                             function addSlideTranslatedFrom(cbAsync){
//                                 process_slide(rows[0], cbAsync);
//                             },
//                             function AddRevisionToSource(cbAsync){
//                                 source.id = rows[0].id;
//                                 Slide.findOne({'_id' : rows[0].id}, (err, found) => {
//                                     let revision = found.revisions.id(new_revision.translated_from.source.revision);
//                                     if (revision){
//                                         source.revision = revision.id;
//                                     } else{
//                                         source.revision = 1;
//                                     }
//                                     cbAsync(null, source);
//                                 });
//                             }
//                         ], (err, source) => {
//                             callback(err, source);
//                         });
//                     } else {
//                         callback(null, source);
//                     }
//                 }
//             });
//         } else {
//             con.query('SELECT deck.* FROM deck JOIN deck_revision ON deck_revision.deck_id = deck.id WHERE deck_revision.id = ' + new_revision.translated_from.source.revision, (err, rows) => {
//                 if (err) {
//                     callback(err, source);
//                 } else {
//                     async.waterfall([
//                         function addDecksToUsage(cbAsync){
//                             process_deck(rows[0], cbAsync);
//                         },
//
//                         function AddRevisionToUsage(cbAsync){
//                             source.id = rows[0].id;
//                             Deck.findOne({'_id' : rows[0].id}, (err, found) => {
//                                 let revision = found.revisions.id(new_revision.translated_from.source.revision);
//                                 if (revision){
//                                     source.revision = revision.id;
//                                 } else{
//                                     //source.revision = 1;
//                                     console.log('REVISION ERROR');
//                                 }
//                                 cbAsync(null, source);
//                             });
//                         }
//                     ], (err, source) => {
//                         callback(err, source);
//                     });
//                 }
//             });
//         }
//     } else {
//         callback(null, source);
//     }
// }

// function collectUsage(new_revision, revision_type, callback){
//     async.waterfall([
//         function getDecks(cbAsync){
//             if (revision_type === 'slide'){
//                 //console.log('adding usage for slide ' + new_revision._id);
//                 con.query('SELECT deck_revision.deck_id AS deck_id, deck_content.deck_revision_id AS revision_id ' +
//                 'FROM deck_content LEFT JOIN deck_revision ON deck_revision.id = deck_content.deck_revision_id ' +
//                 'WHERE item_type = "slide" AND item_id = ' + new_revision.mysql_id, (err, rows) => {
//                     if (err) {
//                         cbAsync(err, null);
//                     } else {
//                         cbAsync(null, rows);
//                     }
//                 });
//             } else {
//                 con.query('SELECT deck_revision.deck_id AS deck_id, deck_content.deck_revision_id AS revision_id ' +
//                 'FROM deck_content LEFT JOIN deck_revision ON deck_revision.id = deck_content.deck_revision_id ' +
//                 'WHERE deck_content.item_type = "deck" AND deck_content.item_id = ' + new_revision.mysql_id, (err, rows) => {
//                     if (err) {
//                         cbAsync(err, null);
//                     } else {
//                         cbAsync(null, rows);
//                     }
//                 });
//             }
//         },
//         function processDecks(rows, cbAsync){
//             if (rows){
//                 async.eachSeries(rows, (row, cbEach) => {
//                     let usage = {};
//                     con.query('SELECT * FROM deck WHERE id = ' + row.deck_id, (err, deck_rows) => {
//                         if (err) {
//                             console.log(err);
//                             cbEach();
//                         }else{
//                             async.waterfall([
//                                 function addDecksToUsage(cbWF){
//                                     process_deck(deck_rows[0], cbWF);
//                                 },
//                                 function AddRevisionToUsage(cbWF){
//                                     Deck.findOne({'_id' : row.deck_id}, (err, found) => {
//                                         usage.id = row.deck_id;
//                                         let revision = found.revisions.id(row.revision_id);
//                                         if (revision){
//                                             usage.revision = revision.id;
//                                         } else{
//                                             console.log('error of async for !!!!!!!!!!!!!!!!' + revision_type + new_revision.mysql_id + '-' + new_revision.id);
//                                             //usage.revision = 1;
//                                         }
//                                         //console.log('USAGE: ' +usage);
//                                         cbWF();
//                                     });
//                                 }
//                             ], () => {
//                                 new_revision.usage.push(usage);
//                                 //new_revision.type = null;
//                                 cbEach();
//                             });
//                         }
//                     });
//                 }, cbAsync);
//             }else{
//                 cbAsync();
//             }
//         }
//     ], callback);
// }

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
            //translated_from: {status: mysql_revision.translation_status, source: {id: null, revision: mysql_revision.translated_from_revision}, translator: {id: mysql_revision.translator_id, username: null}}, //TODO
            media: [], //TODO - if we store them here
            dataSources: mysql_revision.dataSources,
            usage: [],
        };
        async.waterfall([
            function saveRevisionToslide(cbAsync){
                Slide.findById(
                    mysql_revision.slide, (err, found) => {
                        if (err) {console.log(err);}else{
                            let key = new_revision.id-1;
                            found.revisions[key] = new_revision;
                            found.contributors.push({user: new_revision.user});
                            found.active = new_revision.id;
                            found.save( (err) => {
                                if (err) {console.log(err); } else{
                                    cbAsync();
                                }
                            });
                        }
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
            isFeatured: mysql_revision.is_featured,
            priority: 0,
            visibility: mysql_revision.visibility,
            language: language_code,
            //translated_from: {status: mysql_revision.translation_status, source: {id: null, revision: mysql_revision.translated_from_revision}, translator: {id: null, username: null}},
            tags: [],
            preferences: [],
            contentItems: [],
            datasources: [], //TODO
            usage: []
        };
        async.waterfall([
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
                        cbAsync(null, rows);
                    }
                });
            },
            function addItemIdsToContent(rows, cbAsync){
                async.eachOfSeries(rows, (row, key, cbEach) => {
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
                    let arr = rows.filter(function(n){ return n != undefined; });
                    cbAsync(null, arr);
                });
            },
            //function which adds rows to new-revision
            function addContent(rows, cbAsync){
                async.eachSeries(rows, (row, cbEach) => {
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
                                    con.query('SELECT RowNumber FROM (SELECT @row_num := IF(@row_num=NULL,1,@row_num+1) AS RowNumber ,id ,timestamp FROM ' +
                                    ' (SELECT * FROM deck_revision ' +
                                     'INNER JOIN deck_content ON deck_revision.id = deck_content.deck_revision_id ' +
                                     'WHERE deck_id = ' + row.item +
                                     ' GROUP BY id ORDER BY timestamp DESC LIMIT 50) AS t1, (SELECT @row_num := 0) x ' +
                                    ' ORDER BY timestamp ASC ) AS t WHERE t.id = '
                                    + row.item_id, (err, rank_rows) => {
                                        if (err) {
                                            cbwaterfall(err);
                                        }else if (!rank_rows.length){ //the new content item is an empty deck
                                            cbEach();
                                        }else{
                                            cbwaterfall(null, rank_rows[0].RowNumber);
                                        }
                                    });

                                }
                            },
                            function buildContentItem(revision_number, cbwaterfall){
                                if (row.item_type === 'deck' && row.item >=1701 && row.item <=1725){
                                    console.log(new_revision);
                                    //cbwaterfall();
                                }else{
                                    new_revision.contentItems.push({
                                        order: parseInt(row.position),
                                        kind: row.item_type,
                                        ref: {
                                            id: row.item,
                                            revision: revision_number
                                        }
                                    });
                                    cbwaterfall();
                                }
                            }
                        ], cbEach);
                    }else{ //adding item failed
                        //console.log('skipping empty');
                        cbEach();
                    }
                }, () => {
                    cbAsync(null, new_revision);
                });
            },
            function processContent(new_revision, cbAsync){
                async.eachSeries(new_revision.contentItems, (item, cbEach) => {
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
                    cbAsync(null, new_revision);
                });
            },
            // function saveRevisionToDeck(new_revision, cbAsync) {
            //     Deck.findById(
            //         mysql_revision.deck_id, (err, found) => {
            //             let key = new_revision.id-1;
            //             found.revisions[key] = new_revision;
            //             found.contributors.push({user: new_revision.user});
            //             found.active = new_revision.id;
            //             found.save(cbAsync);
            //         }
            //     );
            // }
        ], (err, rev) => {
            callback(err, rev);
        });
    } else{
        callback('something is weird', null);
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

function add_usage_handler(callback){
    Deck.find({}, (err, decks) => {
        async.eachSeries(decks, (deck_id, cbEach) => {
            console.log('Adding usage for deck ' + deck_id);
            add_usage(deck_id, () => {
                cbEach();
            });
        }, callback);
    });
}

function remove_usage(callback){
    async.series([
        (cbAsync) => {
            Deck.find({}, (err, decks) => {
                async.eachSeries(decks, (deck, cbEach) => {
                    console.log('Starting deck');
                    async.eachSeries(deck.revisions, (revision, cbEach2) => {
                        revision.usage = [];
                        cbEach2();
                    }, () => {
                        console.log('finished deck');
                        deck.save( (err) => {
                            if (err) {
                                deck.save(cbEach);
                            }else{
                                cbEach();
                            }
                        });
                    });
                }, cbAsync);
            });
        },
        (cbAsync) => {
            Slide.find({}, (err, slides) => {
                async.each(slides, (slide, cbEach) => {
                    console.log('starting slide');
                    async.eachSeries(slide.revisions, (revision, cbEach2) => {
                        revision.usage = [];
                        cbEach2();
                    }, () => {
                        console.log('finished slide');
                        slide.save( (err) => {
                            if (err) {
                                slide.save(cbEach);
                            }else{
                                cbEach();
                            }

                        });
                    });
                }, cbAsync);
            });
        }
    ], callback);

}

function add_usage(deck_id, callback){ //adds usage looking in the whole decks

    Deck.find({_id: deck_id}, function(err, decks) {
        console.log('Starting to add usage');
        //console.log('FOUND ' + slides.length + 'slides++++++++++++++++++++++++++++++++++++++++++++++');
        async.eachSeries(decks, (deck, cbEach) => {
            //console.log('Adding usage for deck ' + deck.id);
            async.eachSeries(deck.revisions, (revision, cbEach2) => {
                async.eachSeries(revision.contentItems, (item, cbEach3) => {
                    if (item.kind === 'deck'){
                        //console.log(item);
                        Deck.findById(item.ref.id, (err, found) => {
                            //if (err) console.log(err);
                            if (found){
                                async.each(found.revisions, (item_revision, cbEach4) => {
                                    if (item_revision.id === item.ref.revision){
                                        let found_new = item_revision.usage.find(x => x.id === deck._id && x.revision === revision.id);
                                        if (!found_new){
                                            item_revision.usage.push({id : deck._id , revision: revision.id});
                                        }
                                        //console.log('Usage added for slide ' + found._id + '-' + item_revision.id);
                                        //console.log('Finished for a slide');
                                        found.save(cbEach3);
                                        //cbEach3();
                                    }else{
                                        cbEach4();
                                    }
                                }, () => {
                                    console.log('I could not find revision with id ' + item.ref.revision + ' for deck with id ' + item.ref.id);
                                    console.log('Something is wrong with adding usage of deck '+ found.id + ' into deck ' + deck.id + '-' + revision.id);
                                    //cbEach3();
                                });

                            }else{
                                console.log('Not found deck with id ' + item.ref.id);
                                //cbEach3();
                            }
                            // l
                        });
                    }else if (item.kind === 'slide'){ //this is slide item
                        Slide.findById(item.ref.id, (err, found) => {
                            //if (err) console.log(err);
                            if (found){
                                async.each(found.revisions, (item_revision, cbEach4) => {
                                    if (item_revision.id === item.ref.revision){
                                        let found_new = item_revision.usage.find(x => x.id === deck._id && x.revision === revision.id);
                                        if (!found_new){
                                            item_revision.usage.push({id : deck._id , revision: revision.id});
                                        }
                                        //console.log('Usage added for slide ' + found._id + '-' + item_revision.id);
                                        //console.log('Finished for a slide');
                                        found.save(cbEach3);
                                        //cbEach3();
                                    }else{
                                        cbEach4();
                                    }
                                }, () => {
                                    console.log('I could not find revision with id ' + item.ref.revision + ' for slide with id ' + item.ref.id);
                                    console.log('Something is wrong with adding usage of slide '+ found.id + ' into deck ' + deck.id + '-' + revision.id);
                                    console.log(found.revisions);
                                });

                            }else{
                                console.log('Not found slide with id ' + item.ref.id);
                                //cbEach3();
                            }
                        });
                    }else{
                        console.log('Item kind is neither slide or deck');
                        //cbEach3();
                    }
                }, () => {
                    //console.log(count + ' decks without usage left in stack');
                    console.log('Finished for that revision');
                    cbEach2();
                });
            }, () => {

                cbEach();
            });
        },() => {
            console.log('Adding usage is finished');
            callback();
        } );
    });
}

// function add_translations_slides(callback){ //adds translations for all slides presented
//     Slide.find({}, function(err, slides) {
//         async.eachSeries(slides, (slide, cbEach) => {
//             async.eachSeries(slide.revisions, (revision, cbEach2) => {
//                 buildTranslatedFrom(revision, 'slide', (err, source) => {
//                     revision.source = source;
//                     slide.save(cbEach2);
//                 } );
//             }, cbEach);
//         }, callback);
//     });
// }

// function add_usage_deck(callback){ //adds usage for all decks
//     Deck.find({}, function(err, decks) {
//         console.log('FOUND ' + decks.length + 'decks++++++++++++++++++++++++++++++++++++++++++++++');
//         async.eachSeries(decks, (deck, cbEach) => {
//             async.eachSeries(deck.revisions, (revision, cbEach2) => {
//                 collectUsage(revision, 'deck', (err, new_revision) => {
//                     deck.save(cbEach2);
//                 } );
//             }, cbEach);
//         }, callback);
//     });
// }

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
                            seq: rows[0].userid + 10000
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
                            seq: rows[0].deckid + 10000
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
                            seq: rows[0].slideid + 100000
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
