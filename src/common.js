'use strict';



let mongoose = require('mongoose');

let Config = require('./config.js');

let UserSchema = require('./models/user.js');
let DeckSchema = require('./models/deck.js');
let SlideSchema = require('./models/slide.js');
let CounterSchema = require('./models/counters.js');
let ActivitySchema = require('./models/activity.js');
let CommentSchema = require('./models/comment.js');
let NotificationSchema = require('./models/notification.js');
let RevisionsTableSchema = require('./models/revisionsTable.js');


let sw      = mongoose.createConnection(Config.slidewiki_stable);
let SW      = mongoose.createConnection(Config.slidewiki);

module.exports = {
    User : SW.model('Users', UserSchema),
    Deck : SW.model('Decks', DeckSchema.DeckSchema),
    Slide : SW.model('Slides', SlideSchema.SlideSchema),
    Counter : SW.model('Counters', CounterSchema),
    Activity : SW.model('Activities', ActivitySchema),
    Comment: SW.model('Comments', CommentSchema),
    Notification: SW.model('Notifications', NotificationSchema),
    RevisionsTable: SW.model('OldRevisions', RevisionsTableSchema),

    User_stable : sw.model('Users', UserSchema),
    Deck_stable : sw.model('Decks', DeckSchema.DeckSchema),
    Slide_stable : sw.model('Slides', SlideSchema.SlideSchema),
    Counter_stable : sw.model('Counters', CounterSchema),
    Activity_stable : sw.model('Activities', ActivitySchema),
    Comment_stable : sw.model('Comments', CommentSchema),
    Notification_stable : sw.model('Notifications', NotificationSchema),
    RevisionsTable_stable : sw.model('OldRevisions', RevisionsTableSchema),
    sw : sw,
    SW: SW
};
