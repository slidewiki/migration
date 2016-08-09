'use strict';
let mongoose = require('mongoose');

const object_id = {
  type: Number
};

const ContentItem = {
  type: 'object',
  properties: {
    order: {
      type: 'string',
      required: true
    },
    kind: {
      type: 'string',
      enum: ['deck', 'slide'],
      required: true
    },
    item_id: {
      type: Number,
      required: true
    }
  }
};

const DeckRevision = mongoose.Schema({
  _id: 'string',
  title: {
    type: 'string',
    required: true
  },
  timestamp: {
    type: 'string'
  },
  language: {
    type: 'string'
  },
  user_id: object_id,
  parent_revision_id: object_id,
  theme_id: object_id,
  transition_id: object_id,
  comment: {
    type: 'string'
  },
  abstract: {
    type: 'string'
  },
  footer: {
    text: {
      type: 'string'
    }
  },
  isFeatured: {
    type: 'number'
  },
  priority: {
    type: 'number'
  },
  visibility: {
    type: 'boolean'
  },
  language: {
    type: 'string'
  },
  translated_from: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['original', 'google', 'revised']
      },
      source_revision_id: object_id
    }
  },
  tags: [String], //array of strings
  contentItems: [ContentItem], //array of content items
  dataSources: [String] //array of strings?

});

const DeckSchema = mongoose.Schema({
  _id: object_id,
  timestamp: {
    type: 'string',
    required: true
  },
  user_id: {
    type: Number,
    required: true
  },
  translations: { //put here all translations explicitly - deck ids
    type: 'array',
    items: {
      language: {
        type: 'string'
      },
      deck_id: object_id
    }
  },
  translated_from: object_id,
  derived_from: {
    type: 'string'
  },
  lastUpdate: {
    type: 'string'
  },
  revisions: [DeckRevision], //array of deck revisions or array if their ids?
  tags: {
    type: 'array',
    items: {
      type: 'string'
    }
  }
});
module.exports = {DeckSchema, DeckRevision, ContentItem};
