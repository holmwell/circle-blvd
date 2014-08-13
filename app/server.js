// server.js
// TODO: Put all of these in a more robust
// config situation.
process.env.PORT = process.env.PORT || 3000;
process.env.SSL_PORT = process.env.SSL_PORT || 4000;
process.env.DATABASE_NAME = 'circle-blvd';

var app = require('./app.js');

var start = function () {
    app.startServer();
};

app.whenReady(start);