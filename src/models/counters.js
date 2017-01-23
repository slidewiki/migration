'use strict';
let mongoose = require('mongoose');

const CounterSchema = mongoose.Schema({
    _id: {
        type: 'string'
    },
    field: {
        type: 'string'
    },
    seq: {
        type: Number
    }
});

module.exports = CounterSchema;
