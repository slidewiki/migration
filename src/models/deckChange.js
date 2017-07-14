'use strict';

// model how deck changes are saved in log
const _ = require('lodash');
let mongoose = require('mongoose');

const deckModel = require('./deck');

const changePath = {
    id: {
        type: 'number',
    },
    revision: {
        type: 'number',
    },
    title: {
        type: 'string',
    },
    index: {
        type: 'number',
    },
};

const nodeValue = {
    kind: {
        type: 'string',
        enum: [ 'deck', 'slide', ],
    },
    ref: {
        id: {
            type: 'number',
        },
        revision: {
            type: 'number',
        },
        originRevision: {
            type: 'number',
        },
        title: {
            type: 'string',
        },
    },
};

const deckChange = mongoose.Schema({
    op: {
        type: 'string',
        enum: [ 'add', 'remove', 'replace', 'move', 'update', ],
    },
    path: [changePath],
    from: [changePath],

    value: nodeValue,
    oldValue: nodeValue,

    user: {
        type: 'number',
    },
});

module.exports = deckChange;
