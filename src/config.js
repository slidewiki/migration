'use strict';

let Config = {
    slidewiki : 'mongodb://mongodb:27017/slidewiki',
    slidewiki_db_name: 'slidewiki',
    slidewiki_stable : 'mongodb://mongodb:27017/stable',
    slidewiki_stable_db_name: 'stable',
    MysqlConnection : {
        user: 'root',
        password: 'linuxisgreat',
        database: 'slidewiki',
        host: 'mysql'
    }
};

module.exports = Config;
