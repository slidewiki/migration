'use strict';

let mongoose = require('mongoose');
let async = require('async');



let Config = require('./config.js');
let co = require('./common.js');


const Deck = co.Deck;
// const DeckRevision = mongoose.model('DeckRevisions', DeckSchema.DeckRevision);

mongoose.Promise = global.Promise;

//connecting to mongoDB
mongoose.connect(Config.PathToMongoDB, (err) => {
    if (err) throw err;
    return;
});

console.log('Adding editors');


try{
    add_editors(() => {
        mongoose.connection.close();
    });
}
catch (err) {
    console.log(err);
    mongoose.connection.close();
}


function add_editors(callback){
    Deck.find({}, (err, decks) => {
        async.each(decks, (deck, cbEach) => {
            let users = [];
            if (deck.editors) {
                users = deck.editors.users;
            }
            users.push({id: deck.user, joined: deck.timestamp});
            async.each(deck.revisions, (revision, cbEach2) => {
                users.push({id: revision.user, joined: revision.timestamp});
                cbEach2();
            }, () => {
                //sorting the array in order to define the joining dates
                users.sort(function(a, b) {
                    if (a.joined < b.joined)
                        return -1;
                    if (a.joined > b.joined)
                        return 1;
                    return 0;
                });
                //filtering the duplicates, leaving the ones with the earliest joining date
                let flags = {};
                let uniquelist = users.filter(function(entry) {
                    if (flags[entry.id]) {
                        return false;
                    }
                    flags[entry.id] = true;
                    return true;
                });
                deck.editors.users = uniquelist;
                deck.save( () => {
                    cbEach();
                });
            });
        }, () => {
            console.log('Done!');
            callback();
        });
    });
}
