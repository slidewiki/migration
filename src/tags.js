'use strict';

const async = require('async');

const Config = require('./config.js');
const MongoClient = require('mongodb').MongoClient;

// collection should be 'decks' or 'slides'
function fixTags(collection) {
    console.log(`Fixing tags for ${collection.collectionName} collection...`);

    let cursor = collection.find({ "revisions.tags.0": { $exists: true } });

    // keep the update ops here for handling later
    let updateOps = [];

    return new Promise((resolve, reject) => {
        cursor.forEach((doc) => {
            let queryParams, updateParams;
            doc.revisions.forEach((rev, index) => {
                // we are going to fix tag arrays with at least one element that is not new schema compatible
                let needsFix = rev.tags.some((t) => (!t.hasOwnProperty('tagName')));
                if (needsFix) {
                    // we will let the script throw an error if tags array has mixed elements
                    let newTags = rev.tags.filter((t) => (t.length > 0)).map((t) => ({ tagName: t }));
                    // console.log(`tags for ${doc._id}-${rev.id}:`);
                    // console.log(rev.tags);
                    // console.log('will be:');
                    // console.log(newTags);

                    if (!queryParams) {
                        // only need to set this once
                        queryParams = { _id: doc._id };
                        // init
                        updateParams = {};
                    }
                    // keep the new tags per revision in each document
                    updateParams[`revisions.${index}.tags`] = newTags;
                }
            });

            if (queryParams && updateParams) {
                // first element of each op is the query, second is the update params
                updateOps.push([queryParams, { $set: updateParams }]);
            }

        }, (err) => {
            if (err) return reject(err);
            if (updateOps.length === 0) return resolve(0);

            // updateOps has everything we need to do the update
            async.eachSeries(updateOps, (updateOp, callback) => {
                let [query, set] = updateOp;
                console.log(`updating ${JSON.stringify(query)} with ${JSON.stringify(set)}`);
                collection.updateOne(query, set).then((result) => {
                    callback();
                }).catch(callback);
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(updateOps.length);
                }
            });

        });

    });

}

let theDB;
// do the script
MongoClient.connect(Config.PathToMongoDB).then((db) => {
    theDB = db;
    console.log("Connected successfully to server");

    return fixTags(theDB.collection('decks'))
    .then((decksUpdated) => {
        console.log(`Fixed tags in ${decksUpdated} decks`);

        return fixTags(theDB.collection('slides'))
        .then((slidesUpdated) => {
            console.log(`Fixed tags in ${slidesUpdated} slides`);
        });
    });

}).catch((err) => {
    console.error(err);
}).then(() => {
    // finally statements
    console.log("Done!");

    if (theDB) theDB.close();
});
