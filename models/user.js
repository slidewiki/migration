'use strict';
let mongoose = require('mongoose');

const objectid = {
    type: Number,
};

const UserSchema = mongoose.Schema({
    _id: {
        type: Number
    },
    email: {
        type: 'string',
        format: 'email',
        required: true,
    },
    username: {
        type: 'string',
        required: true,
    },
    password: {
        type: 'string'
    },
    defaults: {
        type: 'array',
        items: {
            type: 'object'
        }
    },
    registered: {
        type: 'string',
        format: 'datetime'
    },
    surname: {
        type: 'string'
    },
    forename: {
        type: 'string'
    },
    country: {
        type: 'string'
    },
    spokenLanguages: {
        type: 'array',
        items: {
            type: 'string'
        }
    },
    frontendLanguage: {
        type: 'string',
        required: true,
    },
    picture: {
        type: 'string'
    },
    interests: {
        type: 'string'
    },
    description: {
        type: 'string'
    },
    birthday: {
        type: 'string',
        format: 'date'
    },
    infodeck: {
        type: 'object',
        properties: {
            id: objectid,
            revision: {
                type: Number
            }
        }
    },
    organization: {
        type: 'string'
    }
});

module.exports = UserSchema;
