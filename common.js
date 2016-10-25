'use strict';

let mongoose = require('mongoose');



let UserSchema = require('./models/user.js');
let DeckSchema = require('./models/deck.js');
let SlideSchema = require('./models/slide.js');
let CounterSchema = require('./models/counters.js');


let Config = require('./config.js');

// mongoose.Promise = global.Promise;
//
// //connecting to mongoDB
// mongoose.connect(Config.PathToMongoDB, (err) => {
//     if (err) throw err;
//     return;
// });

module.exports = {
    User : mongoose.model('Users', UserSchema),
    Deck : mongoose.model('Decks', DeckSchema.DeckSchema),
    Slide : mongoose.model('Slides', SlideSchema.SlideSchema),
    Counter : mongoose.model('Counters', CounterSchema),

};
