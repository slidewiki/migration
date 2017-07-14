'use strict';

let mongoose = require('mongoose');

const member = {
    userid: {
        type: 'number',
        required: true
    },
    joined: {
        type: 'string',
        format: 'date-time'
    }
};

const usergroup = mongoose.Schema({
    _id: {
        type: 'number'
    },
    name: {
        type: 'string'
    },
    timestamp: {
        type: 'string',
        format: 'date-time'
    },
    description: {
        type: 'string'
    },
    isActive: {
        type: 'boolean'
    },
    creator: {
        userid: {
            type: 'number',
            required: true
        }
    },
    members: [member]
});

module.exports = usergroup;
