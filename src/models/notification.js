
'use strict';
let mongoose = require('mongoose');

//build schema
const objectid = {
    type: 'string',
    maxLength: 24,
    minLength: 1
};
const NotificationSchema = mongoose.Schema({
    activity_id: objectid,
    activity_type: {
        type: 'string',
        enum: ['translate', 'share', 'add', 'edit', 'comment', 'reply', 'use', 'react', 'rate', 'download']
    },
    timestamp: {
        type: 'object'
    },
    user_id: objectid,
    content_id: {
        type: 'string'
    },
    content_kind: {
        type: 'string',
        enum: ['deck', 'slide']
    },
    content_name: {
        type: 'string'
    },
    content_owner_id: objectid,
    subscribed_user_id: objectid,
    translation_info: {
        content_id: {
            type: 'string'
        },
        language: {
            type: 'string'
        }
    },
    share_info: {
        postURI: {
            type: 'string'
        },
        platform: {
            type: 'string'
        }
    },
    comment_info: {
        comment_id: objectid,
        text: {
            type: 'string'
        }
    },
    use_info: {
        target_id: {
            type: 'string'
        },
        target_name: {
            type: 'string'
        }
    },
    react_type: {
        type: 'string'
    },
    rate_type:  {
        type: 'string'
    }    
});

//export
module.exports = NotificationSchema;
