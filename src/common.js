'use strict';



let mongoose = require('mongoose');

let Config = require('./config.js');

let UserSchema = require('./models/user.js');
let DeckSchema = require('./models/deck.js');
let SlideSchema = require('./models/slide.js');
let CounterSchema = require('./models/counters.js');
let ActivitySchema = require('./models/activity.js');
let DiscussionSchema = require('./models/comment.js');
let NotificationSchema = require('./models/notification.js');
let RevisionsTableSchema = require('./models/revisionsTable.js');
let DeckChangeSchema = require('./models/deckChange.js');
let MediaSchema = require('./models/media.js');
let TagSchema = require('./models/tag.js');
let UsergroupSchema = require('./models/usergroup');


let sw      = mongoose.createConnection(Config.slidewiki_stable);
let SW      = mongoose.createConnection(Config.slidewiki);

module.exports = {
    User : SW.model('Users', UserSchema),
    Deck : SW.model('Decks', DeckSchema.DeckSchema),
    Slide : SW.model('Slides', SlideSchema.SlideSchema),
    Counter : SW.model('Counters', CounterSchema),
    Activity : SW.model('Activities', ActivitySchema),
    Discussion: SW.model('Comments', DiscussionSchema),
    Notification: SW.model('Notifications', NotificationSchema),
    RevisionsTable: SW.model('OldRevisions', RevisionsTableSchema),
    DeckChange: SW.model('Deckchanges', DeckChangeSchema),
    Media: SW.model('Media', MediaSchema),
    Tag: SW.model('Tags', TagSchema),
    Usergroup: SW.model('Usergroups', UsergroupSchema),

    User_stable : sw.model('Users', UserSchema),
    Deck_stable : sw.model('Decks', DeckSchema.DeckSchema),
    Slide_stable : sw.model('Slides', SlideSchema.SlideSchema),
    Counter_stable : sw.model('Counters', CounterSchema),
    Activity_stable : sw.model('Activities', ActivitySchema),
    Discussion_stable : sw.model('Comments', DiscussionSchema),
    Notification_stable : sw.model('Notifications', NotificationSchema),
    RevisionsTable_stable : sw.model('OldRevisions', RevisionsTableSchema),
    DeckChange_stable: sw.model('Deckchanges', DeckChangeSchema),
    Media_stable: sw.model('Media', MediaSchema),
    Tag_stable: sw.model('Tags', TagSchema),
    Usergroup_stable: sw.model('Usergroups', UsergroupSchema),
    sw : sw,
    SW: SW
};
