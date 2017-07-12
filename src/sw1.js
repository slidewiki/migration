'use strict';

let mongoose = require('mongoose');
let async = require('async');
let he = require('he');


let UserSchema = require('./models/user.js');
let DeckSchema = require('./models/deck.js');
let SlideSchema = require('./models/slide.js');
let CounterSchema = require('./models/counters.js');
let Config = require('./config.js');
let co = require('./common.js');
//let fix_user = require('./fix_user.js').migrate_usernames;

const User = co.User;
const Deck = co.Deck;
const Slide = co.Slide;
const Counter = co.Counter;
const Activity = co.Activity;
const Comment = co.Comment;
const Notification = co.Notification;
const RevisionsTable = co.RevisionsTable;

const User_stable = co.User_stable;
const Deck_stable = co.Deck_stable;
const Slide_stable = co.Slide_stable;
const Counter_stable = co.Counter_stable;
const Activity_stable = co.Activity_stable;
const Comment_stable = co.Comment_stable;
const Notification_stable = co.Notification_stable;
const RevisionsTable_stable = co.RevisionsTable_stable;

mongoose.Promise = global.Promise;

//connecting to mongoDB
mongoose.connect(Config.slidewiki, (err) => {
    if (err) {
        console.error('Error connecting to MongoDB');
        throw err;
    } else{
        mongoose.connect(Config.slidewiki_stable), (err) => {
            console.error('Error connecting to MongoDB');
            throw err;
        };
    }
});


async.series([
    //migrate_users, //migrate users
    fix_data,
    remove_usage_stable,
    add_usage_handler_stable,

    //
    update_counters,
    check_decks,

    migrate_decks,
    remove_usage,
    add_usage_handler,

],
(err) => {
    if (err) {
        co.sw.close();
        co.SW.close();
        console.error(err);
        process.exit(0);
    }

    co.sw.close();
    co.SW.close();
    console.log('Migration is successful');
    process.exit(0);
});

function remove_usage_stable(callback){
    async.series([
        (cbAsync) => {
            Deck_stable.find({}, (err, decks) => {
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
            Slide_stable.find({}, (err, slides) => {
                async.eachSeries(slides, (slide, cbEach) => {
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

function add_usage_handler_stable(callback){
    Deck_stable.find({}, (err, decks) => {
        //console.log(decks.length);
        async.eachSeries(decks, (deck, cbEach) => {
            console.log('Adding usage for deck ' + deck._id);
            add_usage_stable(deck._id, () => {
                cbEach();
            });
        }, callback);
    });
}

function add_usage_stable(deck_id, callback){ //adds usage looking in the whole decks

    Deck_stable.find({_id: deck_id}, function(err, decks) {
        console.log('Starting to add usage');
        //console.log('FOUND ' + slides.length + 'slides++++++++++++++++++++++++++++++++++++++++++++++');
        async.eachSeries(decks, (deck, cbEach) => {
            //console.log('Adding usage for deck ' + deck.id);
            async.eachSeries(deck.revisions, (revision, cbEach2) => {
                async.eachSeries(revision.contentItems, (item, cbEach3) => {
                    if (item.kind === 'deck'){
                        //console.log(item);
                        Deck_stable.findById(item.ref.id, (err, found) => {
                            //if (err) console.log(err);
                            if (found){
                                async.eachSeries(found.revisions, (item_revision, cbEach4) => {
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
                        Slide_stable.findById(item.ref.id, (err, found) => {
                            //if (err) console.log(err);
                            if (found){
                                async.eachSeries(found.revisions, (item_revision, cbEach4) => {
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

function update_counters(callback){
    //find max id for decks, slides and Users in SW
    //set those as counters for stable
    async.series([
        (callback1) => {
            Counter_stable.findOne({'_id': 'users'}, (err, counter_stable) => {
                User.findOne({}).sort('-_id').exec((err, maximum) => {
                    //console.log(maximum._id);
                    if (counter_stable.seq < maximum._id){
                        counter_stable.seq = maximum._id;
                        counter_stable.save(callback1);
                    }else{
                        callback1();
                    }
                });
            });
        },
        (callback2) => {
            Counter_stable.findOne({'_id': 'decks'}, (err, counter_stable) => {
                Deck.findOne({}).sort('-_id').exec((err, maximum) => {
                    if (counter_stable.seq < maximum._id){
                        counter_stable.seq = maximum._id;
                        counter_stable.save(callback2);
                    }else{
                        callback2();
                    }
                });
            });
        },
        (callback3) => {
            Counter_stable.findOne({'_id': 'slides'}, (err, counter_stable) => {
                Slide.findOne({}).sort('-_id').exec((err, maximum) => {
                    if (counter_stable.seq < maximum._id){
                        counter_stable.seq = maximum._id;
                        counter_stable.save(callback3);
                    }else{
                        callback3();
                    }
                });
            });
        },

    ],
    // optional callback
    (err, results) => {
        callback();
    });

}

function fix_data(callback){
    async.series([
        (callback1) => {
            Deck_stable.update({'_id': 9580}, {$pull: {'revisions.0.contentItems':{'ref.id':9580}}}, {}, (err, num) =>{
                if (err) console.log(err);
                console.log(num);
                callback1();
            });
        },
        (callback1) => {
            Deck_stable.update({'_id': 264}, {$pull: {'revisions.1.contentItems':{'ref.id':264}}}, {}, (err, num) =>{
                if (err) console.log(err);
                console.log(num);
                callback1();
            });
        },
    ],callback);

}

function check_decks(callback){
    //check all decks on stabe if they have conflicts by id
    //if they have - solve the conflicts inside
    console.log('Checking decks for id conflicts');
    Deck_stable.find({}, (err, decks_stable) => {

        let count = decks_stable.length;
        async.eachSeries(decks_stable, (deck_stable, cbEach) => {
            Deck.findById(deck_stable._id, (err, deck) =>{

                console.log('Need to check ' + count + ' more decks');
                if (deck) {
                    console.log('Checking a duplicate');
                    if (deck.user !== deck_stable.user || deck.revisions[0].title !== deck_stable.revisions[0].title) {
                        console.log('Solving conflict for id ' + deck_stable._id);
                        async.waterfall([
                            (callback1) => {
                                Counter_stable.findOne({_id: 'decks'}, (err, decks_counter) => {
                                    if (err) console.log(err);
                                    decks_counter.seq++;
                                    decks_counter.save(() => {callback1(decks_counter.seq);});
                                });
                            },
                            (new_id, callback1) => {
                                let stable_object = deck_stable.toObject();
                                delete stable_object._v;

                                if (err) console.log(err);
                                stable_object._id = new_id;
                                let new_old_deck = new Deck_stable(stable_object);
                                new_old_deck.save((err) => {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        callback1(new_old_deck);
                                    }
                                });

                            },
                            (new_old_deck, callback1) => { //change the ids in decks which use this one
                               async.eachSeries(deck_stable.revisions, (revision, cbEach1) => {
                                   if (revision.usage.length){
                                       async.eachSeries(revision.usage, (usage, cbEach2) => {
                                           Deck_stable.findOne({_id: usage.id}, (err, deck) => {
                                               if (err) console.log(err);
                                               console.log('DECK: ' +deck);
                                               async.eachSeries(deck.revisions[usage.revision-1].contentItems, (item, cbEach3) => {
                                                   if (item.kind === 'deck' && item.ref.id === deck_stable._id){

                                                   item.ref.id = new_old_deck._id;
                                                   cbEach3();

                                                   }else{
                                                       cbEach3();
                                                   }
                                               }, () => {
                                                   deck.save(cbEach2);
                                               });
                                           });
                                       }, () => {
                                           cbEach1();
                                       });
                                   }else{
                                       cbEach1();
                                   }

                               }, () => {
                                   callback1(new_old_deck);
                               });
                            },
                            (new_old_deck, callback1) => { //change the ids in decks which use this one
                                async.eachSeries(deck_stable.revisions, (revision, cbEach1) => {
                                    async.eachSeries(revision.contentItems, (item, cbEach2) => {
                                        let model = {};
                                        if (item.kind === 'deck'){
                                            model = Deck_stable;
                                        }else{
                                            model = Slide_stable;
                                        }
                                        model.findOne({_id: item.ref.id}, (err, item2) => {
                                            if (err) console.log(err);
                                            let revision = item2.revisions[item.ref.revision-1];
                                            async.eachSeries(revision.usage, (usage_entry, cbEachN) => {
                                                if (usage_entry.id === deck_stable._id){
                                                    usage_entry.id = new_old_deck._id;
                                                    cbEachN();
                                                }else{
                                                    cbEachN();
                                                }
                                            }, () => {
                                                item2.save(cbEach2);
                                            });
                                        });
                                    }, () => {
                                        cbEach1();
                                    });
                                }, () => {
                                    callback1(new_old_deck);
                                });
                            },
                            (new_old_deck, callback1) => {
                                Activity_stable.find({content_id: deck_stable._id, content_kind: 'deck'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_deck._id;
                                        found.save(cbEach);
                                    }, () => {
                                        callback1(new_old_deck);
                                    });
                                });
                            },
                            (new_old_deck, callback1) => {
                                Comment_stable.find({content_id: deck_stable._id, content_kind: 'deck'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_deck._id;
                                        found.save(cbEach);
                                    }, () => {
                                        callback1(new_old_deck);
                                    });
                                });
                            },
                            (new_old_deck, callback1) => {
                                Notification_stable.find({content_id: deck_stable._id, content_kind: 'deck'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_deck._id;
                                        found.save(cbEach);
                                    }, () => {
                                        callback1(new_old_deck);
                                    });
                                });
                            }
                        ],
                        () => {
                            Deck_stable.remove({_id: deck_stable._id}, (err, removed) => {
                                if (err) {
                                    console.log('Deck conflict failed to solve, id = ' + removed._id + ' error: ' + err);
                                }else{
                                    count--;
                                    cbEach();
                                }
                            });
                        });
                    }else{
                        console.log('Duplicate is valid');
                        count--;
                        cbEach();
                    }
                }else{
                    count--;
                    cbEach();
                }
            });
        }, callback);
    });
}

function migrate_decks(callback){
    Deck_stable.find({}, (err, decks)=>{
        async.eachSeries(decks, (deck, cbEach)=> {
            let object = deck.toObject();
            delete object.__v;
            let new_deck = new Deck(object);
            new_deck.save((err) => {
                if (err) {
                    if (err.code === 11000) { //the deck on stable has the same id as the deck from old slidewiki
                        Deck.findOne({'_id':new_deck._id}, (err, existing) => {
                            console.log('Updating deck ' + new_deck._id);
                            existing = deck;
                            existing.save( (err) => {
                                if (err) {
                                    console.log('failed to update deck ' + existing._id +' error: ' +err);
                                    cbEach();
                                }
                                else cbEach();
                            });
                        });
                    }else{
                        console.log('failed to save deck ' + new_deck._id + ' error: ' + err);
                    }
                } else cbEach();
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
                async.eachSeries(slides, (slide, cbEach) => {
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
                                async.eachSeries(found.revisions, (item_revision, cbEach4) => {
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
                                async.eachSeries(found.revisions, (item_revision, cbEach4) => {
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


function add_usage_handler(callback){
    Deck.find({}, (err, decks) => {
        async.eachSeries(decks, (deck, cbEach) => {
            console.log('Adding usage for deck ' + deck._id);
            add_usage(deck._id, () => {
                cbEach();
            });
        }, callback);
    });
}
