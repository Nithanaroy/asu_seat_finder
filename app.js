var express = require('express');

var env = process.env.NODE_ENV = process.env.NODE_ENV || "development";

var app = express();

config = require('./config/config')[env];

require('./config/express')(app, config);

require('./config/routes')(app);

app.listen(config.port, function() {
    console.log('Express server listening on port ' + config.port);
});
