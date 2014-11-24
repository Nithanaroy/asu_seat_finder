var path = require('path');

var rootPath = process.cwd();

module.exports = {
    development: {
        rootPath: rootPath,
        db: '',
        port: process.env.PORT || 3000
    },
    production: {
        rootPath: rootPath,
        db: '',
        port: process.env.PORT || 80
    }
};
