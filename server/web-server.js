// web-server.js
// 
var http       = require('http');
var sslServer  = require('circle-blvd/https-server');

var app = undefined;
var io  = undefined;

var httpPort  = 3000;
var httpsPort = 4000;

var tryToCreateHttpsServer = function (callback) {
    sslServer.create(app, httpsPort, function (err, success) {
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

    httpServer.listen(httpPort, function () {
        console.log("Express http server listening on port " + httpPort);
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

var setHttpsPort = function (port) {
    httpsPort = port;
};

var setHttpPort = function (port) {
    httpPort = port;
};

module.exports = function (expressApp, ioModule) {
    app = expressApp;
    io = ioModule;

    return {
        https: {
            restart: restartHttps,
            isRunning: isHttpsRunning,
            setPort: setHttpsPort
        },
        setPort: setHttpPort,
        start: startServer
    };
};