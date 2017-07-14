'use strict';
let mongoose = require('mongoose');

const objectid = {
    type: Number,
};

const provider = mongoose.Schema({
    provider: {
        type: 'string',
        required: true
    },
    token: {
        type: 'string',
        required: true
    },
    expires: {
        type: 'number'
    },
    extra_token: {
        type: 'string'
    },
    scope: {
        type: 'string'
    },
    token_creation: {
        type: 'string',
        format: 'date-time',
        required: true
    },
    id: {
        type: 'string'
    },
    identifier: {
        type: 'string'
    },
    email: {
        type: 'string'
    }
});

const UserSchema = mongoose.Schema({
    _id: {
        type: 'number'
    },
    email: {
        type: 'string',
        format: 'email',
        required: true
    },
    username: {
        type: 'string',
        required: true
    },
    password: {
        type: 'string'
    },
    defaults: [{}],
    registered: {
        type: 'string',
        format: 'date-time'
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
    spokenLanguages: [String],
    frontendLanguage: {
        type: 'string',
        required: true
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
        id: objectid,
        revision: {
            type: 'number'
        }
    },
    organization: {
        type: 'string'
    },
    deactivated: {
        type: 'boolean'
    },
    providers: [provider]
});

module.exports = UserSchema;
