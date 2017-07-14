'use strict';
let mongoose = require('mongoose');

//build schema
const objectid = {
    type: 'string',
    maxLength: 24,
    minLength: 1
};
const CommentSchema = mongoose.Schema({

    title: {
        type: 'string'
    },
    text: {
        type: 'string'
    },
    timestamp: {},
    user_id: {
        type: Number,
        required: true
    },
    parent_comment: objectid,
    content_id: {
        type: 'string',
        required: true
    },
    content_kind: {
        type: 'string',
        enum: ['deck', 'slide']
    },
    is_activity: {
        type: 'boolean'
    }
});


//export
module.exports = CommentSchema;
