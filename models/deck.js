'use strict';
let mongoose = require('mongoose');

const object_id = {
    type: Number
};

const ContentItem = {

    order: {
        type: 'string',
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

const DeckRevision = {
    id: Number,
    _id: Number,
    title: {
        type: 'string',
        required: true
    },
    timestamp: {
        type: 'string'
    },
    language: {
        type: 'string'
    },
    user: {
        type: String
    },
    license: {
        type: String
    },
    parent: {
        id: String,
        revision: Number
    },
    //CHANGE TO
    //user_id: object_id,
    //parent_revision_id: object_id,
    theme_id: object_id,
    transition_id: object_id,
    comment: {
        type: 'string'
    },
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
        type: 'object',
        properties: {
            status: {
                type: 'string',
                enum: ['original', 'google', 'revised']
            },
            source_revision_id: object_id
        }
    },
    tags: [String], //array of strings
    contentItems: [ContentItem], //array of content items
    dataSources: [String], //array of strings?
    usage: [Number] //where this revision is used
};

const DeckSchema = mongoose.Schema({
    _id: object_id,
    timestamp: {
        type: 'string',
        required: true
    },
    user: {
        type: 'string',
        required: true
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
    translated_from: object_id,
    derived_from: {
        type: 'string'
    },
    lastUpdate: {
        type: 'string'
    },
    revisions: [DeckRevision], //array of deck revisions or array if their ids?
    tags: {
        type: 'array',
        items: {
            type: 'string'
        }
    },
    active: Number
});
module.exports = {DeckSchema, DeckRevision, ContentItem};
