'use strict';

let mongoose = require('mongoose');

const tag = mongoose.Schema({
    _id: {
        type: 'number'
    },
    tagName: {
        type: 'string'
    },
    defaultName: {
        type: 'string'
    },
    uri: {
        type: 'string'
    },
    user: {
        type: 'number',
        required: true
    },
    timestamp: {
        type: 'string'
    }
});
module.exports = tag;
