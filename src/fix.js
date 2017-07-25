'use strict';

let mongoose = require('mongoose');
let async = require('async');



let Config = require('./config.js');
let co = require('./common.js');


const Deck = co.Deck;
const Slide = co.Slide;
// const DeckRevision = mongoose.model('DeckRevisions', DeckSchema.DeckRevision);

mongoose.Promise = global.Promise;

const FILE_URL_PREFIX = 'https://fileservice';

//connecting to mongoDB
mongoose.connect(Config.PathToMongoDB, (err) => {
    if (err) throw err;
    return;
});

console.log('fixing the database');


async.series([
    fix_timestamp_type_decks,
    fix_timestamp_type_slides,
    prepend_slide_title
],
(err) => {
    if (err) {
        mongoose.connection.close();
        return console.error(err);
    }
    mongoose.connection.close();
    return console.log('The database is fixed');
});


function prepend_slide_title(callback){
    console.log('Prepending slide titles');
    Slide.find({'revisions.0.mysql_id':{$ne:null}}, (err, slides) => {
        async.each(slides, (slide, cbEach) => {
            async.each(slide.revisions, (revision, cbEach2) => {
                let content = revision.content;
                let rePPTX = 'pptx2html';
                //revision.title = revision.title.replace(/[|/+,]/g, '');
                let reAlreadyIn = '<h3>' + revision.title + '</h3>';

                let matchPPTX, matchAlreadyIn = '';
                try {
                    matchAlreadyIn = content.match(reAlreadyIn);
                    matchPPTX = content.match(rePPTX);
                    if (!matchPPTX && !matchAlreadyIn){ //this is not imported slide and there is no title already prepended
                        revision.content = '<h3>' + revision.title + '</h3>' + content;
                    }
                    revision.content = revision.content.replace(/(?:http:\/\/slidewiki\.org|\.)\/upload/g, FILE_URL_PREFIX);
                    revision.content = revision.content.replace('http://fileservice', FILE_URL_PREFIX);

                    cbEach2();
                } catch (error) {
                    console.log('error of prepending title for slide ' + slide._id + '-' + revision.id);
                    cbEach2();
                }


            }, () => {
                slide.save(cbEach);
            });

        }, () => {
            callback();
        });
    });
}

function fix_timestamp_type_decks(callback) {
    console.log('Fixing the decks timestamps and lastUpdates NOW');
    Deck.find({}, (err, decks) => {
        async.each(decks, (deck, cbEach) => {
            deck.timestamp = new Date(deck.timestamp).toISOString(); //fixing timestamp

            if (deck.lastUpdate === 'function now() { [native code] }'){
                deck.lastUpdate = new Date().toISOString(); //fixing last_update - set to now
            }else{
                deck.lastUpdate = new Date(deck.lastUpdate).toISOString(); //fixing timestamp
            }

            if (!deck.license) {
                deck.license = 'CC BY-SA';
            }
            async.eachSeries(deck.revisions, (revision, cbEach2) => {
                revision.timestamp = new Date(revision.timestamp).toISOString();
                for(let i = 0; i < revision.contentItems.length; i++){ //sorry for that
                    revision.contentItems[i].order = parseInt(revision.contentItems[i].order)-5;
                    revision.contentItems[i].order +=5;
                }
                cbEach2();
            },
            () => {
                deck.save(cbEach);
            });
        }, () => {
            callback();
        });
    });
}

function fix_timestamp_type_slides(callback) {
    console.log('Fixing the slides timestamps and lastUpdates');
    Slide.find({}, (err, slides) => {
        async.each(slides, (slide, cbEach) => {

            //deck.timestamp = new String(deck.timestamp);
            if (slide.lastUpdate === 'function now() { [native code] }'){
                slide.lastUpdate = new Date().toISOString();
            }
            if (!slide.license) {
                slide.license = 'CC BY-SA';
            }
            async.eachSeries(slide.revisions, (revision, cbEach2) => {
                revision.timestamp = new Date(revision.timestamp).toISOString();
                if (revision.id === 1) {
                    slide.timestamp = revision.timestamp;
                }
                cbEach2();
            },
            () => {
                slide.save(cbEach);
            });
        }, () => {
            callback();
        });
    });
}
