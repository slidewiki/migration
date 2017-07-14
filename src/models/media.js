'use strict';

let mongoose = require('mongoose');

const media = mongoose.Schema({

    _id: {
        type: 'string',
        maxLength: 24,
        minLength: 24
    },
    title: {
        type: 'string'
    },
    type: {
        type: 'string',
        enum: ['image/jpeg', 'image/png', 'audio/ogg', 'audio/mp3', 'audio/opus', 'video/h264', 'video/h265'],
        required: true
    },
    fileName: {
        type: 'string',
        required: true
    },
    thumbnailName: {
        type: 'string'
    },
    owner: { //userid
        type: 'number',
        required: true
    },
    license: {
        type: 'string',
        enum: ['CC0', 'Creative Commons 4.0', 'Creative Commons 3.0'],
        required: true
    },
    originalCopyright: {
        type: 'string',
        required: true
    },
    slidewikiCopyright: {
        type: 'string',
        required : true
    },
    metadata: {}
});

module.exports = media;
