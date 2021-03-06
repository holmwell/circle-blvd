// server.js
// 
// The main entry point for Circle Blvd. Handles
// command-line arguments.
// 
var config = require('./back-end/config.js');
var app    = require('./back-end/app.js');

// Process command-line arguments
var isDebugging = false;
for (var index in process.argv) {
    if (process.argv[index] === '--debug') {
        isDebugging = true;
    }
}

config.isDebugging = isDebugging;

// Start the app.
app.init(config, function (err, startServer) {
    if (startServer) {
        startServer();
    }
});