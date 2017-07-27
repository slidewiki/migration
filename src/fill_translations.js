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
let translated_slides = {}; //the same for slides
let languages_slides = {}; //the same for slides
//let current_graph = 1;

function find_roots(type, object, callback){ //find the root of the tree to which the deck belongs
    if (type ==='deck'){
        let deck = object;
        console.log('Finding root for deck ' + deck._id);
        Deck.findById(deck.origin.id, (err, origin) => {
            if (err) {
                callback(err);
            }else if (!origin) {
                console.log('origin not found, origin_id: ' + deck.origin.id);
                callback(null,deck._id);
            }else {
                if (translated[deck.origin.id]){
                    find_roots(type, origin, callback);
                }else{
                    console.log('Root found:' + deck.origin.id);
                    callback(null, deck.origin.id);
                }

            }
        });
    }else{
        let slide = object;
        console.log('Finding root for slide ' + slide._id);
        Slide.findById(slide.origin.id, (err, origin) => {
            if (err) {
                console.log(err);
                callback(err);
            }else if (!origin) {
                console.log('origin not found, origin_id: ' + slide.origin.id);
                callback('404',slide._id);
            }else {
                if (translated_slides[slide.origin.id]){
                    find_roots(type, origin, callback);
                }else{
                    console.log('Root found:' + slide.origin.id);
                    callback(null, slide.origin.id);
                }

            }
        });
    }


}



function basic_fill(callback){ //fill translated (the decks with origins, saving the type of origin as well)
    async.series([
        (cb1) => {
            console.log('Processing decks');
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
                    collect_roots('deck', ()=>{cb1();}); //collecting roots for those decks
                });
            });
        },
        (cb1)=>{
            console.log('Processing slides');
            Slide.find({'origin' : {$not: {$type : 10}, $exists: true} }, (err, slides) => {
                async.each(slides, (slide, cbEach) => {
                    Slide.findById(slide.origin.id, (err, origin)=>{
                        if (err) console.log(err); else{
                            if (origin){
                                if (slide.revisions[0].language!==origin.revisions[0].language){ //this is translation
                                    translated_slides[slide._id] = true;
                                    slide.origin.kind='translation';
                                    slide.save(cbEach);
                                }else{
                                    slide.origin.kind='fork';
                                    slide.save(cbEach);
                                }
                            }else{
                                slide.origin = {}; //the source deck does not exist
                                slide.save(cbEach);
                            }
                        }
                    });
                }, () => {
                    //console.log(JSON.stringify(translated_slides));
                    collect_roots('slide', ()=>{cb1();}); //collecting roots for those decks
                });
            });
        }

    ], ()=>{
        callback();
    });

}

function invert_array(array){ //invert the array
    let inverted = [];
    Object.keys(array).forEach((key)=>{
        if (inverted[array[key]]){
            inverted[array[key]].push(key);
        }else{
            inverted[array[key]] = [key, array[key]]
        }
    });
    return cleanArray(inverted); //removing nulls

}

function cleanArray(actual) {
    var newArray = new Array();
    for (var i = 0; i < actual.length; i++) {
        if (actual[i]) {
            newArray.push(actual[i]);
        }
    }
    return newArray;
}


function collect_roots(type, callback){
    let roots = [];
    if (type==='deck'){
        async.eachOfSeries(translated, (value, key, cbEach) => {
            Deck.findById(key, (err, deck) => {
                if (err || !deck) console.log('Deck in translated not found: ' + key);
                else{
                    find_roots('deck', deck, (err, root) => {
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

            let inverted = invert_array(translated);
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
    }else{
        async.eachOfSeries(translated_slides, (value, key, cbEach) => {
            Slide.findById(key, (err, slide) => {
                if (err || !slide) console.log('Slide in translated not found: ' + key);
                else{
                    find_roots('slide',slide, (err, root) => {
                        if (err) {
                            console.log(err);
                        } else{
                            roots.push(root);
                            translated_slides[key] = root; //filling the roots
                            languages_slides[key]=slide.revisions[0].language; //filling the languages
                            cbEach();
                        }
                    });
                }
            });
        }, () => {
            console.log('making translations array for slides');
            let inverted = invert_array(translated_slides);
            async.series([
                (cb1) => { //filling out the roots languages
                    async.each(uniq(roots), (root_id, cbEach2)=>{
                        Slide.findById(root_id, (err, root)=>{
                            if (root){
                                languages_slides[root_id] = root.revisions[0].language;
                                cbEach2();
                            }else{
                                console.log('Root slide not found: ' + root_id);
                                cbEach2();
                            }
                        });
                    }, ()=>{cb1();});
                },
                (cb1) =>{ //making and saving translations
                    async.each(inverted, (graph, cbEach3)=>{
                        let translations = [];
                        async.each(graph, (slide_id, cbEach4)=>{
                            translations.push({'slide_id': slide_id, 'language' : languages_slides[slide_id]});
                            cbEach4();
                        }, () => {
                            async.each(graph, (slide_id, cbEach5)=>{
                                Slide.findById(slide_id, (err, slide)=>{
                                    if (slide){
                                        console.log('Filling the translation for slide ' + slide_id);
                                        slide.translations = translations;
                                        slide.save(cbEach5);
                                    }else{
                                        console.log('Slide not found' + slide_id);
                                    }
                                });
                            }, ()=>{
                                cbEach3();
                            });
                        });
                    },() => {cb1();});
                }
            ],()=>{
                callback();
            });
        });
    }

}
