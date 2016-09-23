'use strict';

let mongoose = require('mongoose');
//build schema
const objectid = {
    type: Number
};
const Contributor = {
    id: {
        type: 'number',
        required: true
    },
    name: {
        type: 'string'
    }
};
const SlideRevision = mongoose.Schema({
    _id: Number,
    id: { //increment with every new revision
        type: 'number',
        minimum: 1,
        required: true
    },
    title: {
        type: 'string'
    },
    timestamp: {
        type: 'string',
        format: 'datetime'
    },
    content: {
        type: 'string'
    },
    speakerNotes: {
        type: 'string'
    },
    user: objectid,
    parent: {
        id: Number,
        revision: Number
    },
    //CHANGE TO
    //parent_revision_id: objectid,
    popularity: {
        type: 'number',
        minimum: 0
    },
    comment: 'string',
    license: {
        type: 'string',
        enum: ['CC0', 'CC BY', 'CC BY-SA']
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
    tags: ['string'],
    media: [objectid],
    dataSources: ['string'],
    usage: [{id: Number, revision: Number}]
});

const SlideSchema = mongoose.Schema({
    _id: 'number',
    user: objectid,
    description: {
        type: 'string'
    },
    translations: { //put here all translations explicitly - slide ids
        type: 'array',
        items: {
            language: {
                type: 'string'
            },
            deck_id: objectid
        }
    },
    timestamp: {
        type: 'string',
        format: 'datetime'
    },
    revisions: [SlideRevision],
    contributors: {
        type: 'array',
        items: {
            oneOf: [
                Contributor
            ]
        }
    },
    tags: {
        type: 'array',
        items: {
            type: 'string'
        }
    },
    active: objectid,
    datasource: 'string',
    lastUpdate: {
        type: 'string',
        format: 'datetime'
    }
});

//export
module.exports = {SlideSchema, SlideRevision, Contributor};