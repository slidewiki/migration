'use strict';
let mongoose = require('mongoose');

const object_id = {
    type: Number
};

const trackedDeckProperties = {
    license: {
        type: 'string',
        enum: [ 'CC0', 'CC BY', 'CC BY-SA' ]
    },
    description: {
        type: 'string'
    },

};

const trackedDeckRevisionProperties = {
    title: {
        type: 'string'
    },
    language: {
        type: 'string'
    },

    //NOTE: temporarily store themes with their name
    theme: {
        type: 'string',
    },
    tags: [{tagName: String}]
};

const ContentItem = {

    order: {
        type: Number,
        required: true
    },
    kind: {
        type: 'string',
        enum: ['deck', 'slide'],
        required: true
    },
    ref: {
        id: {
            type: Number,
            required :true
        },
        revision: {
            type: Number,
            required: true
        },
        _id: Number
    },
    _id: Number
};

const Contributor = {
    user: {
        type: 'number',
        required: true
    },
    count: {
        type: 'number'
    }
};

const DeckRevision = mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    _id: Number,
    mysql_id: Number,
    title: {
        type: 'string'
    },
    timestamp: {
        type: String,
        required: true
    },
    lastUpdate: String,
    originRevision: Number,
    user: {
        type: Number,
        required: true
    },
    parent: {
        id: Number
    },
    popularity: Number,
    language: {
        type: 'string'
    },
    theme: 'string',
    transition: {
        default: Number,
    },
    comment: 'string',
    abstract: {
        type: 'string'
    },
    footer: {
        text: {
            type: 'string'
        }
    },
    isFeatured: {
        type: 'number'
    },
    priority: {
        type: 'number'
    },
    visibility: {
        type: 'boolean'
    },
    translation: {
        status: {
            type: 'string',
            enum: ['original', 'google', 'revised']
        },
        source: {}
    },
    preferences: [{}],

    tags: [{tagName:'string'}], //array of strings
    contentItems: [ContentItem], //array of content items
    dataSources: [String], //array of strings?
    usage: [{id: {type: 'number', required: true}, revision: {type: 'number', required: true}}] //where this revision is used
});

const DeckSchema = mongoose.Schema({
    _id: object_id,
    timestamp: {
        type: String,
        required: true
    },
    user: {
        type: 'number',
        required: true
    },
    description: {
        type: 'string'
    },
    translations: { //put here all translations explicitly - deck ids
        type: 'array',
        items: {
            language: {
                type: 'string'
            },
            deck_id: object_id
        }
    },
    origin: {
        id: {
            type: Number,
        },
        revision: {
            type: Number,
        },
        mysql_revision: Number,
        user: Number,
        title: String,
        kind: String
    },

    lastUpdate: {
        type: 'string',
        format: 'datetime'
    },
    revisions: [DeckRevision], //array of deck revisions or array if their ids?
    tags: [{tagName:'string'}],
    active: Number,
    datasource: String,
    license: {
        type: String,
        enum: ['CC0', 'CC BY', 'CC BY-SA', null]
    },
    contributors: [Contributor],
    editors: {
        users: [{
            _id:false,
            id: object_id,
            username: String,
            picture: String,
            joined: String
        }],
        groups: [{
            id: Number,
            name: String,
            joined: String
        }]
    }
});
module.exports = {DeckSchema, DeckRevision, ContentItem};
