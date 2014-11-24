var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser');


module.exports = function(app, config) {
    // view engine setup
    app.set('views', path.join(config.rootPath, 'views'));
    app.set('view engine', 'jade');

    // app.use(favicon(config.rootPath + '/public/img/favicon.ico'));
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(cookieParser());
    app.use(express.static(path.join(config.rootPath, 'public')));

    app.set('port', config.port);
}
