'use strict';

const helper = require('./lib_userservice/helper');

console.log('Now fixing users ...');

// migrate_usernames(() => {
//     console.log('migrate_usernames executed - now stopping node');
//     process.exit(0);
// });

function migrate_usernames(done) {
    console.log('This will cleanup usernames and handle username duplication!');
    return helper.connectToDatabase()
        .then((db) => db.createCollection('users_duplications'))
        .then((collection) => collection.drop())
        .then((result) => {
            console.log('Got result from drop users_duplications:', result);
            return helper.connectToDatabase()
                .then((db) => db.createCollection('users_migrated'))
                .then((collection) => collection.drop())
                .then(() => {
                    console.log('Got result from drop users_migrated:', result);
                    return helper.connectToDatabase()
                        .then((db) => db.collection('users'))
                        .then((coll) => coll.mapReduce(function () {
                            if (!this.username || !this.email)
                                return;

                            this.email = this.email.toLowerCase();
                            emit(this.username.toLowerCase().replace(/[|\s&;$%&§\{\[\]\}@"<>()+,!?\-._~\=\*\+\#\;\\/]/g, ''), this);
                        },
                            function (key, values) {
                                if (values.length === undefined || values.length === null || values.length < 1)
                                    values = [values];
                                let o = {
                                    count: 1,
                                    username: key,
                                    users: values.reduce(function (prev, curr) {
                                        if (curr.count === undefined || curr.count === null || curr.count < 1)
                                            prev.push(curr);
                                        else {
                                            let result = [];
                                            prev.forEach((e) => {
                                                result.push(e);
                                            });
                                            curr.users.forEach((e) => {
                                                result.push(e);
                                            });
                                            prev = result;
                                        }
                                        return prev;
                                    }, [])
                                };
                                o.count = o.users.length;
                                return o;
                            }, {
                                out: 'users_duplications'
                            }
                        ))
                        .then((collection) => collection.count())
                        .then((result) => {
                            console.log('Got result from first mapReduce:', result);
                            return helper.connectToDatabase()
                                .then((db) => db.collection('users_duplications'))
                                .then((coll) => coll.mapReduce(function () {
                                        if (this.value.count === undefined || this.value.count === null || this.value.count < 1) {
                                            this.value.username = this.value.username.replace(/[|\s&;$%&§\{\[\]\}@"<>()+,!?\=\*\+\#\;\\/]/g, '_');
                                            emit(this.value._id, this.value);
                                        } else {
                                            let i = 0;
                                            this.value.users.forEach(function (user) {
                                                if (user !== undefined) {
                                                    let username = user.username.replace(/[|\s&;$%&§\{\[\]\}@"<>()+,!?\=\*\+\#\;\\/]/g, '_');
                                                    while (username.charAt(username.length - 1) === '_') {
                                                        username = username.substr(0, username.length - 1);
                                                    }
                                                    for (let j = 0; j < i; j++) {
                                                        username = username + '_';
                                                    }
                                                    i++;
                                                    user.username = username;
                                                    emit(user._id, user);
                                                }
                                            });
                                        }
                                    },
                                    function (key, values) {
                                        return values[0];
                                    }, {
                                        out: 'users_migrated'
                                    }
                                ))
                                .then((collection) => collection.count())
                                .then((result) => {
                                    console.log('Got result from second mapReduce:', result);
                                    return helper.connectToDatabase()
                                        .then((db) => db.collection('users_migrated'))
                                        .then((coll) => coll.aggregate([{
                                            $replaceRoot: {
                                                newRoot: '$value'
                                            }
                                        }, {
                                            $out: 'users'
                                        }]))
                                        .then((collection) => collection.toArray())
                                        .then((result) => {
                                            console.log('Finished!!! Got results from aggregate:', result.length);
                                            done();
                                            return true;
                                        });
                                });
                        });
                });
        })
        .catch((error) => {
            console.log('Error:', error);
            done();
            return;
        });
}

module.exports = {
    migrate_usernames
};
