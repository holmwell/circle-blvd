// web-server.js
// 
// 
var http       = require('http');
var sslServer  = require('circle-blvd/https-server');

var app = undefined;
var io  = undefined;

var tryToCreateHttpsServer = function (callback) {
    sslServer.create(app, function (err, success) {
        if (err) {
            console.log(err);
            if (callback) {
                callback(err);
            }
            return;
        }
        
        console.log(success);
        if (sslServer.isRunning()) {
            io.attach(sslServer.getServer());
        }

        if (callback) {
            callback();
        }
    });
};

var startServer = function () {
    var httpServer = http.createServer(app);

    httpServer.listen(app.get('port'), function () {
        console.log("Express http server listening on port " + app.get('port'));
        io.attach(httpServer);
    });

    // Run an https server if we can.
    tryToCreateHttpsServer();
};

var isHttpsRunning = function () {
    return sslServer && sslServer.isRunning();
};

var restartHttps = function (callback) {
    tryToCreateHttpsServer(callback);
};

module.exports = function (app, io) {
    app = app;
    io = io;

    return {
        https: {
            restart: restartHttps,
            isRunning: isHttpsRunning
        }
        start: startServer
    };
};