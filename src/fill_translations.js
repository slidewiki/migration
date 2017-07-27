'use strict';

let mongoose = require('mongoose');
let async = require('async');



let Config = require('./config.js');
let co = require('./common.js');


const Deck = co.Deck;
const Slide = co.Slide;
// const DeckRevision = mongoose.model('DeckRevisions', DeckSchema.DeckRevision);

mongoose.Promise = global.Promise;

//connecting to mongoDB
mongoose.connect(Config.PathToMongoDB, (err) => {
    if (err) throw err;
    return;
});

console.log('Filling in translations');


try{
    basic_fill(() => {
        console.log('Test the translation now!');
        mongoose.connection.close();
        process.exit(0);
    });
}
catch (err) {
    console.log(err);
    mongoose.connection.close();
    process.exit(0);
}

function uniq(a) { //returns an array of unique values
    var prims = {'boolean':{}, 'number':{}, 'string':{}}, objs = [];

    return a.filter(function(item) {
        var type = typeof item;
        if(type in prims)
            return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
        else
            return objs.indexOf(item) >= 0 ? false : objs.push(item);
    });
}

let translated = {}; //here we have all decks which were originated from other decks deck_id:root_id - root is the root of the whole tree, not a direct source
let languages = {}; //here we keep the languages deck_id:language

//let current_graph = 1;

function find_roots(deck, callback){ //find the root of the tree to which the deck belongs
    console.log('Finding root for deck ' + deck._id);
    Deck.findById(deck.origin.id, (err, origin) => {
        if (err) {
            callback(err);
        }else if (!origin) {
            console.log('origin not found, origin_id: ' + deck.origin.id);
            callback(null,deck._id);
        }else {
            if (translated[deck.origin.id]){
                find_roots(origin, callback);
            }else{
                console.log('Root found:' + deck.origin.id);
                callback(null, deck.origin.id);
            }

        }
    });

}



function basic_fill(callback){ //fill translated (the decks with origins, saving the type of origin as well)

    Deck.find({'origin' : {$not: {$type : 10}, $exists: true} }, (err, decks) => {
        async.each(decks, (deck, cbEach) => {
            Deck.findById(deck.origin.id, (err, origin)=>{
                if (err) console.log(err); else{
                    if (origin){
                        if (deck.revisions[0].language!==origin.revisions[0].language){ //this is translation
                            translated[deck._id] = true;
                            deck.origin.kind='translation';
                            deck.save(cbEach);
                        }else{
                            deck.origin.kind='fork';
                            deck.save(cbEach);
                        }
                    }else{
                        deck.origin = {}; //the source deck does not exist
                        deck.save(cbEach);
                    }
                }
            });
        }, () => {
            collect_roots(callback); //collecting roots for those decks
        });
    });
}


function collect_roots(callback){
    let roots = [];
    async.eachOfSeries(translated, (value, key, cbEach) => {
        Deck.findById(key, (err, deck) => {
            if (err || !deck) console.log('Deck in translated not found: ' + key);
            else{
                find_roots(deck, (err, root) => {
                    if (err) {
                        console.log(err);
                    } else{
                        roots.push(root);
                        translated[key] = root; //filling the roots
                        languages[key]=deck.revisions[0].language; //filling the languages
                        cbEach();
                    }
                });
            }
        });
    }, () => {

        let inverted = {};
        async.eachOfSeries(translated, (value, key, cbEach1)=> {
            if (inverted[value]){
                inverted[value].push(key);
                cbEach1();
            }else{
                inverted[value] = [key, value];
                cbEach1();
            }
        },()=> {
            async.each(uniq(roots), (root_id, cbEach2)=>{

                Deck.findById(root_id, (err, root)=>{
                    if (root){
                        languages[root_id] = root.revisions[0].language;
                        cbEach2();
                    }else{
                        console.log('Root deck not found: ' + root_id);
                        cbEach2();
                    }

                });
            }, ()=> {
                async.each(inverted, (graph, cbEach3)=>{
                    let translations = [];
                    async.each(graph, (deck_id, cbEach4)=>{
                        translations.push({'deck_id': deck_id, 'language' : languages[deck_id]});
                        cbEach4();
                    }, ()=>{
                        async.each(graph, (deck_id, cbEach5)=>{
                            Deck.findById(deck_id, (err, deck)=>{
                                if (deck){
                                    console.log('Filling the translation for deck ' + deck_id);
                                    deck.translations = translations;
                                    deck.save(cbEach5);
                                }else{
                                    console.log('Deck not found' + deck_id);
                                }
                            });
                        }, ()=>{
                            cbEach3();
                        });
                    });
                },() => {callback();});
            });
        });
    });
}




//                         item_deck.translations = deck.translations
//                     })
//                 });
//                 cbEach();
//             })
//
//         }, () => {
//             console.log('Done!');
//             callback();
//         });
//     });
// }
