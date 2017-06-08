'use strict';
let mongoose = require('mongoose');

const object_id = {
    type: Number
};

const RevisionsTable = mongoose.Schema({
    _id: object_id,
    deck_id: Number,
    user_id: Number
});

module.exports = RevisionsTable;
