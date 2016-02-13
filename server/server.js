// server.js
// 
// The main entry point for Circle Blvd. Handles
// command-line arguments and the highest level
// config for the app.
// 
// 

// Process command-line arguments
var isDebugging = false;
for (var index in process.argv) {
    if (process.argv[index] === '--debug') {
        isDebugging = true;
    }
}

// Process environment variables, for now
// 
// TODO: Put all of these in a more robust
// config situation, and get out of messing
// with process.env so that we can have a 
// healthy test environment.
process.env.DATABASE_NAME = 'circle-blvd';

var config = {
    isDebugging: isDebugging,
    httpPort: process.env.PORT || 3000,
    httpsPort: process.env.SSL_PORT || 4000
};


// This line must be after the env variables are set.
var app = require('./app.js');

// Start the app.
app.init(config);

// Wait for the database and such to initialize
app.whenReady(start);

function start () {
    app.startServer();
}