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

// Process command-line arguments
var isDebugging = false;
for (var index in process.argv) {
    if (process.argv[index] === '--debug') {
        isDebugging = true;
    }
}

app.init({
    isDebugging: isDebugging
});

app.whenReady(start);