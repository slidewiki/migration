'use strict';
let mongoose = require('mongoose');

const objectid = {
  type: 'string',
  maxLength: 24,
  minLength: 24
};

const UserSchema = mongoose.Schema({
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
    type: 'string',
    required :true
  },
  defaults: {
    type: 'array',
    items: {
      type: 'object'
    }
  },
  surname: {
    type: 'string'
  },
  forename: {
    type: 'string'
  },
  gender: {
    type: 'string',
    enum: ['male', 'female', null]
  },
  locale: {
    type: 'string'
  },
  hometown: {
    type: 'string'
  },
  location: {
    type: 'string'
  },
  languages: {
    type: 'array',
    items: {
      type: 'string'
    }
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
  birthday_mysql: {
    type: 'string'
  },
  birthday: {
    type: 'object',
    properties: {
      year: {
        type: 'number'
      },
      month: {
        type: 'number'
      },
      day: {
        type: 'number'
      }
    }
  },
  infodeck: objectid,
  infodeck_mysqlid: String
});

module.exports = UserSchema;
