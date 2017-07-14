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
const Discussion = co.Discussion;
const Notification = co.Notification;
const RevisionsTable = co.RevisionsTable;
const DeckChange = co.DeckChange;
const Media = co.Media;
const Tag = co.Tag;
const Usergroup = co.Usergroup;

const User_stable = co.User_stable;
const Deck_stable = co.Deck_stable;
const Slide_stable = co.Slide_stable;
const Counter_stable = co.Counter_stable;
const Activity_stable = co.Activity_stable;
const Discussion_stable = co.Discussion_stable;
const Notification_stable = co.Notification_stable;
const RevisionsTable_stable = co.RevisionsTable_stable;
const DeckChange_stable = co.DeckChange_stable;
const Media_stable = co.Media_stable;
const Tag_stable = co.Tag_stable;
const Usergroup_stable = co.Usergroup_stable;

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
    check_slides,
    check_users,

    migrate_decks,
    migrate_slides,
    migrate_users,
    migrate_media,
    migrate_usergroups

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

function check_users(callback){
    //check all decks on stabe if they have conflicts by id
    //if they have - solve the conflicts inside
    console.log('Checking users for id conflicts');
    User_stable.find({}, (err, users_stable) => {

        let count = users_stable.length;
        async.eachSeries(users_stable, (user_stable, cbEach) => {
            User.findById(user_stable._id, (err, user) =>{

                console.log('Need to check ' + count + ' more users');
                if (user) {
                    console.log('Checking a duplicate');
                    if (user.username !== user_stable.username || user.email !== user_stable.email) {
                        console.log('Solving conflict for id ' + user_stable._id);
                        async.waterfall([
                            (callback1) => {
                                Counter_stable.findOne({_id: 'users'}, (err, users_counter) => {
                                    if (err) console.log(err);
                                    users_counter.seq++;
                                    users_counter.save(callback1(err, users_counter.seq));
                                });
                            },
                            (new_id, callback1) => {
                                let stable_object = user_stable.toObject();
                                delete stable_object._v;
                                stable_object._id = new_id;
                                stable_object.rating = 100;
                                let new_old_user = new User_stable(stable_object);
                                new_old_user.save(callback1(err, new_id));
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing activities of user ' + user_stable._id);
                                Activity_stable.find({'user_id':user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.user_id = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                Activity_stable.find({'content_owner_id':user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.content_owner_id = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing deckChanges of user ' + user_stable._id);
                                DeckChange_stable.find({'user':user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.user = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing decks of user ' + user_stable._id);
                                Deck_stable.find({'user':user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.user = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one

                                Deck_stable.find({'revisions.user':user_stable._id}, (err, decks) => {
                                    async.each(decks, (iterate, cb) => {
                                        async.each(iterate.revisions, (revision, cb2) => {
                                            if (revision.user === user_stable._id){
                                                revision.user = id;
                                                cb2();
                                            }else{
                                                cb2();
                                            }
                                        }, () => {
                                            iterate.save(cb);
                                        });
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing slides of user ' + user_stable._id);
                                Slide_stable.find({'revisions.user':user_stable._id}, (err, decks) => {
                                    async.each(decks, (iterate, cb) => {
                                        async.each(iterate.revisions, (revision, cb2) => {
                                            if (revision.user === user_stable._id){
                                                revision.user = id;
                                                cb2();
                                            }else{
                                                cb2();
                                            }
                                        }, () => {
                                            iterate.save(cb);
                                        });
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one

                                Slide_stable.find({'user':user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        console.log('Changing slide ' + iterate._id);
                                        iterate.user = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing Discussions of user ' + user_stable._id);
                                Discussion_stable.find({'user_id':user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.user_id = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing media of user ' + user_stable._id);
                                Media_stable.find({'owner':user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.owner = id;
                                        //if (iterate.slidewikiCopyright === 'Held by SlideWiki User '+user_stable._id)
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                Media_stable.find({'slidewikiCopyright': 'Held by SlideWiki User ' + user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.slidewikiCopyright = 'Held by SlideWiki User ' + id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing Notifications of user ' + user_stable._id);
                                Notification_stable.find({'user_id': user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.user_id = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                Notification_stable.find({'content_owner_id': user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.content_owner_id = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing Tags of user ' + user_stable._id);
                                Tag_stable.find({'user': user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.user = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                console.log('Changing Usergroups of user ' + user_stable._id);
                                Usergroup_stable.find({'members.userid': user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        async.each(iterate.members, (member, cb2) => {
                                            if (member.userid === user_stable._id){
                                                member.userid = id;
                                                cb2();
                                            }else{
                                                cb2();
                                            }
                                        }, () => {
                                            iterate.save(cb);
                                        });

                                    }, callback1(err, id));
                                });
                            },
                            (id, callback1) => { //change the ids in decks which use this one
                                Usergroup_stable.find({'creator.userid': user_stable._id}, (err, activities) => {
                                    async.each(activities, (iterate, cb) => {
                                        iterate.creator.userid = id;
                                        iterate.save(cb);
                                    }, callback1(err, id));
                                });
                            },
                        ],
                        (err) => {
                            if (err) console.log(err);
                            else{
                                User_stable.remove({_id: user_stable._id}, (err, removed) => {
                                    if (err) {
                                        console.log('User conflict failed to solve, id = ' + removed._id + ' error: ' + err);
                                    }else{
                                        count--;
                                        cbEach();
                                    }
                                });
                            }
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
                                    decks_counter.save(callback1(err, decks_counter.seq));
                                });
                            },
                            (new_id, callback1) => {
                                let stable_object = deck_stable.toObject();
                                delete stable_object._v;

                                if (err) console.log(err);
                                stable_object._id = new_id;
                                let new_old_deck = new Deck_stable(stable_object);
                                new_old_deck.save(callback1(err, new_old_deck));

                            },
                            (new_old_deck, callback1) => { //change the ids in decks which use this one
                                console.log('Changing revisions for deck ' + deck_stable._id);
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
                                       }, (err) => {
                                           cbEach1(err);
                                       });
                                   }else{
                                       cbEach1();
                                   }

                               }, (err) => {
                                   callback1(err, new_old_deck);
                               });
                            },
                            (new_old_deck, callback1) => { //change the ids in decks which use this one
                                console.log('Changing contentItems for deck ' + deck_stable._id);
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
                                    }, (err) => {
                                        cbEach1(err);
                                    });
                                }, (err) => {
                                    callback1(err, new_old_deck);
                                });
                            },
                            (new_old_deck, callback1) => {
                                console.log('Changing activities for deck ' + deck_stable._id);
                                Activity_stable.find({content_id: deck_stable._id, content_kind: 'deck'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_deck._id;
                                        found.save(cbEach);
                                    }, (err) => {
                                        callback1(err, new_old_deck);
                                    });
                                });
                            },
                            (new_old_deck, callback1) => {
                                console.log('Changing comments for deck ' + deck_stable._id);
                                Discussion_stable.find({content_id: deck_stable._id, content_kind: 'deck'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_deck._id;
                                        found.save(cbEach);
                                    }, (err) => {
                                        callback1(err, new_old_deck);
                                    });
                                });
                            },
                            (new_old_deck, callback1) => {
                                console.log('Changing notifications for deck ' + deck_stable._id);
                                Notification_stable.find({content_id: deck_stable._id, content_kind: 'deck'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_deck._id;
                                        found.save(cbEach);
                                    }, (err) => {
                                        callback1(err, new_old_deck);
                                    });
                                });
                            }
                        ],
                        (err) => {
                            if (err) {
                                console.log(err);
                            }else{
                                Deck_stable.remove({_id: deck_stable._id}, (err, removed) => {
                                    if (err) {
                                        console.log('Deck conflict failed to solve, id = ' + removed._id + ' error: ' + err);
                                    }else{
                                        count--;
                                        cbEach();
                                    }
                                });
                            }

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


function check_slides(callback){
    //check all decks on stabe if they have conflicts by id
    //if they have - solve the conflicts inside
    console.log('Checking slides for id conflicts');
    Slide_stable.find({}, (err, slides_stable) => {

        let count = slides_stable.length;
        async.eachSeries(slides_stable, (slide_stable, cbEach) => {
            Slide.findById(slide_stable._id, (err, slide) =>{

                console.log('Need to check ' + count + ' more slides');
                if (slide) { //slide exists
                    console.log('Checking a duplicate');
                    if (slide.user !== slide_stable.user || slide.revisions[0].title !== slide_stable.revisions[0].title) { //these are different slides
                        console.log('Solving conflict for id ' + slide_stable._id);
                        async.waterfall([
                            (callback1) => {
                                Counter_stable.findOne({_id: 'slides'}, (err, slides_counter) => {
                                    if (err) console.log(err);
                                    slides_counter.seq++;
                                    slides_counter.save((err) => {callback1(err, slides_counter.seq);});
                                });
                            },
                            (new_id, callback1) => {
                                let stable_object = slide_stable.toObject();
                                delete stable_object._v;

                                if (err) console.log(err);
                                stable_object._id = new_id;
                                let new_old_slide = new Slide_stable(stable_object);
                                new_old_slide.save(callback1(err, new_old_slide));

                            },
                            (new_old_slide, callback1) => { //change the ids in decks which use this slide
                                console.log('Changing revisions for slide ' + slide_stable._id);
                               async.eachSeries(slide_stable.revisions, (revision, cbEach1) => {
                                   if (revision.usage.length){
                                       async.eachSeries(revision.usage, (usage, cbEach2) => {
                                           Deck_stable.findOne({_id: usage.id}, (err, deck) => {
                                               if (err) console.log(err);
                                               async.eachSeries(deck.revisions[usage.revision-1].contentItems, (item, cbEach3) => {
                                                   if (item.kind === 'slide' && item.ref.id === slide_stable._id){

                                                   item.ref.id = new_old_slide._id;
                                                   cbEach3();

                                                   }else{
                                                       cbEach3();
                                                   }
                                               }, () => {
                                                   deck.save(cbEach2);
                                               });
                                           });
                                       }, (err) => {
                                           cbEach1(err);
                                       });
                                   }else{
                                       cbEach1();
                                   }
                               }, (err) => {
                                   callback1(err, new_old_slide);
                               });
                            },
                            (new_old_slide, callback1) => {
                                console.log('Changing activities for slide ' + slide_stable._id);
                                Activity_stable.find({content_id: slide_stable._id, content_kind: 'slide'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_slide._id;
                                        found.save(cbEach);
                                    }, (err) => {
                                        callback1(err, new_old_slide);
                                    });
                                });
                            },
                            (new_old_slide, callback1) => {
                                console.log('Changing discussions for slide ' + slide_stable._id);
                                Discussion_stable.find({content_id: slide_stable._id, content_kind: 'slide'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_slide._id;
                                        found.save(cbEach);
                                    }, (err) => {
                                        callback1(err, new_old_slide);
                                    });
                                });
                            },
                            (new_old_slide, callback1) => {
                                console.log('Changing notifications for slide ' + slide_stable._id);
                                Notification_stable.find({content_id: slide_stable._id, content_kind: 'slide'}, (err, founds) => {
                                    async.eachSeries(founds, (found, cbEach) => {
                                        found.content_id = new_old_slide._id;
                                        found.save(cbEach);
                                    }, (err) => {
                                        callback1(err, new_old_slide);
                                    });
                                });
                            }
                        ],
                        (err) => {
                            if (err) {
                                console.log(err);
                            }else{
                                Slide_stable.remove({_id: slide_stable._id}, (err, removed) => {
                                    if (err) {
                                        console.log('Slide conflict failed to solve, id = ' + removed._id + ' error: ' + err);
                                    }else{
                                        count--;
                                        cbEach();
                                    }
                                });
                            }
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

function migrate_slides(callback){
    Slide_stable.find({}, (err, slides)=>{
        async.eachSeries(slides, (slide, cbEach)=> {
            let object = slide.toObject();
            delete object.__v;
            let new_slide = new Slide(object);
            new_slide.save((err) => {
                if (err) {
                    if (err.code === 11000) { //the slide on stable has the same id as the slide from old slidewiki, and they are the same
                        Slide.findOne({'_id':new_slide._id}, (err, existing) => {
                            console.log('Updating slide ' + new_slide._id);
                            existing = slide;
                            existing.save( (err) => {
                                if (err) {
                                    console.log('failed to update slide ' + existing._id +' error: ' +err);
                                    cbEach();
                                }
                                else cbEach();
                            });
                        });
                    }else{
                        console.log('failed to save slide ' + new_slide._id + ' error: ' + err);
                    }
                } else cbEach();
            });

        }, callback);
    });
}

function migrate_users(callback){
    User_stable.find({}, (err, users)=>{
        async.eachSeries(users, (user, cbEach)=> {
            let object = user.toObject();
            delete object.__v;
            let new_user = new User(object);
            new_user.rating = 100;
            new_user.save((err) => {
                if (err) {
                    if (err.code === 11000) { //the slide on stable has the same id as the slide from old slidewiki, and they are the same
                        User.findOne({'_id':new_user._id}, (err, existing) => {
                            console.log('Updating user ' + new_user._id);
                            existing = user;
                            existing.rating = 0;
                            existing.save( (err) => {
                                if (err) {
                                    console.log('failed to update user ' + existing._id +' error: ' +err);
                                    cbEach();
                                }
                                else cbEach();
                            });
                        });
                    }else{
                        console.log('failed to save user ' + new_user._id + ' error: ' + err);
                    }
                } else cbEach();
            });

        }, callback);
    });
}

function migrate_usergroups(callback){
    Usergroup_stable.find({}, (err, groups)=>{
        async.eachSeries(groups, (group, cbEach)=> {
            let object = group.toObject();
            delete object.__v;
            let new_group = new Usergroup(object);
            new_group.save((err) => {
                if (err) {
                    console.log(err);
                } else cbEach();
            });
        }, callback);
    });
}

function migrate_media(callback){
    Media_stable.find({}, (err, medias)=>{
        async.eachSeries(medias, (media, cbEach)=> {
            let object = media.toObject();
            delete object.__v;
            let new_media = new Media(object);
            new_media.save((err) => {
                if (err) {
                    console.log(err);
                } else cbEach();
            });
        }, callback);
    });
}
