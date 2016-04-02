// app.js
// 
// The Express app that listens via
// an http server.
//
// To run, do something like this:
//
// var app = require('app.js');
// app.init(config, function () {
//     app.startServer();
// });
//
var express = require('express');
var app;
var io;

// data
var couchLib = require('circle-blvd/data/couch/couch');
var dbLib    = require('circle-blvd/dataAccess');

// routes
var routes      = require('./routes.js');
var staticFiles = require('./static-files.js');

// sessions
var sessionDatabaseLib = require('circle-blvd/data/sessions/session-database');
var sessionMakerLib    = require('circle-blvd/secret-session-maker');

// express middleware
var compression    = require('compression');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');

// circle-blvd modules
var errors  = require('circle-blvd/errors');
var session = require('circle-blvd/session');

var settingsLib = require('circle-blvd/settings');
var paymentLib  = require('circle-blvd/payment');

var auth = require('circle-blvd/auth-local');
var payment;

var webServerLib = require('circle-blvd/web-server');
var webServer;

// circle-blvd middleware
var forceHttps  = require('circle-blvd/middleware/force-https');
var firstRun    = require('circle-blvd/middleware/first-run');
var socketSetup = require('circle-blvd/middleware/socket-setup');

var canonicalDomain = require('circle-blvd/middleware/canonical-domain');
var corsIonic       = require('circle-blvd/middleware/cors-ionic');

var defaultSettings = require('./back-end/settings');


// configure Express
var init = function (config, callback) {
    config = ensureConfig(config);
    callback = ensureCallback(callback);

    var isDebugging = config.isDebugging;

    // server foundation
    app = express();
    io  = require('socket.io')();

    var couch    = couchLib(config.database);
    var db       = dbLib(couch);
    var settings = settingsLib(db);
    payment      = paymentLib(db);

    webServer = webServerLib(app, io, settings);
    webServer.setPort(config.httpPort);
    webServer.https.setPort(config.httpsPort);

    // Views and view engines
    var path = require('path');
    app.set('views', path.join(__dirname, '/front-end/views'));
    app.set('view engine', 'jade');

    // HTML, CSS, JavaScript files location
    var staticPath = path.join(__dirname, './front-end/public');

    settings.addListener(onSettingsUpdate);
    settings.init(defaultSettings, processSettings);

    function processSettings (err) {
        if (err) {
            callback(err);                
            return;
        }

        // Payment
        var stripeApiKey = settings.value('stripe-secret-key');
        if (stripeApiKey) {
            payment.setApiKey(stripeApiKey);
        }

        // Set up the app with our session secret
        var sessionSecret = settings.value('session-secret');
        setupApp(sessionSecret);
        
        callback(null, webServer.start);
    }

    function setupApp (sessionSecret) {
        // Middleware stack
        //
        // Canonical domain needs to be before https, otherwise 
        // a browser will try to use the canonical https certificate
        // to connect to the non-canonical domain
        app.use(canonicalDomain(settings.lazy('domain-name')));
        app.use(forceHttps(webServer.https));

        app.use(compression());

        if (isDebugging) {
            app.use(corsIonic);
        }

        // HTML, CSS, JavaScript files
        app.use(staticFiles(staticPath, isDebugging));

        // Logging
        app.use(logger('dev'));

        // Cookies / HTTP body parser
        app.use(cookieParser());
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());
        // 
        app.use(methodOverride()); 

        // Sessions
        var sessionDatabaseName = config.sessionDatabase.name;
        var sessionDatabase = sessionDatabaseLib(sessionDatabaseName);    
        var sessionMiddleware = session.middleware(sessionSecret, sessionDatabase);
        app.use(sessionMiddleware);

        // Authentication
        app.use(auth(db).middleware);
        
        // Settings cache
        app.use(settings.middleware);

        // Is this the first run of the system?
        app.use(firstRun(db));

        // Real-time engine
        app.use(socketSetup(io, sessionMiddleware, db));

        // Routes
        var sessionMaker = sessionMakerLib(sessionDatabase, db.users);
        app.use("/", routes(sessionMaker, db));

        // Catch errors
        app.use(errors.middleware);
    };
}; 

function onSettingsUpdate (setting) {
    if (setting.name === 'ssl-key-path' || setting.name === 'ssl-cert-path') {
        webServer.https.restart();
    }

    if (setting.name === 'stripe-secret-key') {
        payment.setApiKey(setting.value);
    }
};

function ensureConfig (config) {
    var defaults = {
        isDebugging: false,
        httpPort: 3000,
        httpsPort: 4000,
        database: {
            name: 'circle-blvd'
        },
        sessionDatabase: {}
    };

    config = config || defaults;

    config.isDebugging  = config.isDebugging  || defaults.isDebugging;
    config.httpPort     = config.httpPort     || defaults.httpPort;
    config.httpsPort    = config.httpsPort    || defaults.httpsPort;

    config.database = config.database || defaults.database;
    config.sessionDatabase = config.sessionDatabase || defaults.sessionDatabase;

    return config;
}

function ensureCallback (callback) {
    if (!callback) {
        return function() {};
    }
    return callback;
}

exports.express = function() {
    return app;
};
exports.init = init;