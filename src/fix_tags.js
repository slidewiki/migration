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

console.log('Fixing tags');


try{
    fix_tags(() => {
        mongoose.connection.close();
    });
}
catch (err) {
    console.log(err);
    mongoose.connection.close();
}


function fix_tags(callback){
    Deck.find({}, (err, decks) => {
        async.each(decks, (deck, cbEach) => {
            if (deck.tags){
                let tags = deck.tags;
                let new_tags = [];
                async.each(tags, (tag, cbEach2) => {
                    if (!tag.tagName){
                        new_tags.push({'tagName': tag});
                    }else{
                        new_tags.push(tag);
                    }
                    deck.tags = new_tags;
                    cbEach2();             
                }, () => {
                    deck.save(cbEach);
                });
            }
        }, () => {
            console.log('Done!');
            callback();
        });
    });
}
