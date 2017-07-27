'use strict';

let mongoose = require('mongoose');
//build schema
const objectid = {
    type: Number
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
const dataSource = {
    type: {
        type: String,
        required: true
    },
    title: {
        type: 'string',
        required: true
    },
    url: {
        type: 'string'
    },
    comment: {
        type: 'string'
    },
    authors: {
        type: 'string'
    },
    year: {
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
    mysql_id: Number,
    title: {
        type: 'string'
    },
    timestamp: {
        type: String,
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
    language: String,
    //CHANGE TO
    //parent_revision_id: objectid,
    popularity: {
        type: 'number',
        minimum: 0
    },
    comment: 'string',
    note: {
        type: 'string'
    },
    translation: {
        status: {
            type: 'string',
            enum: ['original', 'google', 'revised']
        },
        source: {
            id: {
                type: 'number'
            },
            revision: {
                type: 'number'
            }
        },
        translator: Number,
    },
    tags: [{tagName:'string'}],
    media: [objectid],
    dataSources: [dataSource],
    usage: [{id: {type: Number, required: true}, revision: {type: Number, required: true}}]
});

const SlideSchema = mongoose.Schema({
    _id: 'number',
    user: {
        type: Number,
        required: true
    },
    description: {
        type: 'string'
    },
    translations: [
        {
            language: {
                type: 'string'
            },
            slide_id: objectid
        }],
    translated_from: {
        status: {
            type: 'string',
            enum: ['original', 'google', 'revised']
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
            id: Number,
            username: String
        },
    },
    origin: {
        id: objectid,
        revision: Number,
        mysql_revision: Number,
        user: Number,
        title: String,
        kind: String
    },
    timestamp: {
        type: String,
        format: 'date-time'
    },
    revisions: [SlideRevision],
    contributors: [Contributor],
    //active: objectid,
    datasource: 'string',
    lastUpdate: {
        type: 'string',
        format: 'datetime'
    },
    license: {
        type: 'string',
        enum: ['CC0', 'CC BY', 'CC BY-SA']
    }
});

//export
module.exports = {SlideSchema, SlideRevision, Contributor};
