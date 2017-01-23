'use strict';
let mongoose = require('mongoose');

const object_id = {
    type: Number
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
        id: Number,
        revision: Number,
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
    id: Number,
    _id: Number,
    mysql_id: Number,
    title: {
        type: 'string',
        required: true
    },
    timestamp: {
        type: String
    },
    user: {
        type: Number
    },
    parent: {
        id: Number,
        revision: Number
    },
    language: {
        type: 'string'
    },
    theme: object_id,
    transition: object_id,
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
    translated_from: {
        status: {
            type: 'string',
            enum: ['original', 'google', 'revised', null]
        },
        source: {
            id: {
                type: 'number'
            },
            revision: {
                type: 'number'
            }
        },
        translator: {
            id: 'number',
            username: 'string'
        }
    },
    tags: [String], //array of strings
    contentItems: [ContentItem], //array of content items
    dataSources: [String], //array of strings?
    usage: [{id: Number, revision: Number}] //where this revision is used
});

const DeckSchema = mongoose.Schema({
    _id: object_id,
    timestamp: {
        type: String
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
    translated_from: {
        status: {
            type: 'string',
            enum: ['original', 'google', 'revised', null]
        },
        source: {
            id: {
                type: 'number'
            },
            revision: {
                type: 'number'
            }
        },
        translator: {
            id: 'number',
            username: 'string'
        }
    },
    lastUpdate: {
        type: 'string',
        format: 'datetime'
    },
    revisions: [DeckRevision], //array of deck revisions or array if their ids?
    tags: {
        type: 'array',
        items: {
            type: 'string'
        }
    },
    active: Number,
    datasource: String,
    license: {
        type: String,
        enum: ['CC0', 'CC BY', 'CC BY-SA']
    },
    contributors: [Contributor],
});
module.exports = {DeckSchema, DeckRevision, ContentItem};
