var path = require('path');

var rootPath = process.cwd();

module.exports = {
    development: {
        rootPath: rootPath,
        db: 'mongodb://localhost:27017',
        port: process.env.PORT || 3000
    },
    production: {
        rootPath: rootPath,
        db: 'mongodb://asu_seat_finder:password@ds055680.mongolab.com:55680/asu_seat_finder',
        port: process.env.PORT || 80
    }
};
