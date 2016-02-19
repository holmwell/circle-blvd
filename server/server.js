// server.js
// 
// The main entry point for Circle Blvd. Handles
// command-line arguments and the highest level
// config for the app.
// 
// 
var config = require('./config.js');

// Process command-line arguments
var isDebugging = false;
for (var index in process.argv) {
    if (process.argv[index] === '--debug') {
        isDebugging = true;
    }
}

config.isDebugging = isDebugging;


// This line must be after the env variables are set.
var app = require('./app.js');

// Start the app.
app.init(config, function () {
    app.startServer();
});