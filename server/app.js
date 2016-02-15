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

// express middleware
var compression    = require('compression');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');

// routes
var routes      = require('./routes.js');
var staticFiles = require('./static-files.js');

// circle-blvd modules
var auth    = require('circle-blvd/auth-local');
var errors  = require('circle-blvd/errors');
var session = require('circle-blvd/session');

var payment  = require('circle-blvd/payment')();
var settings = require('circle-blvd/settings');

var app        = express();
var io         = require('socket.io')();
var webServer  = require('circle-blvd/web-server')(app, io);

// circle-blvd middleware
var forceHttps  = require('circle-blvd/middleware/force-https')(webServer.https);
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

    webServer.setPort(config.httpPort);
    webServer.https.setPort(config.httpsPort);
    
    // Views and view engines
    app.set('views', __dirname + '/front-end/views');
    app.set('view engine', 'jade');

    // For index.ejs. On its way out.
    app.engine('ejs', require('ejs').__express);
    
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
        
        callback();
    }

    function setupApp (sessionSecret) {
        // Middleware stack
        //
        // Canonical domain needs to be before https, otherwise 
        // a browser will try to use the canonical https certificate
        // to connect to the non-canonical domain
        app.use(canonicalDomain(settings.lazy('domain-name')));
        app.use(forceHttps);

        app.use(compression());

        if (isDebugging) {
            app.use(corsIonic);
        }

        // HTML, CSS, JavaScript files
        app.use(staticFiles(isDebugging));

        // Logging
        app.use(logger('dev'));

        // Cookies / HTTP body parser
        app.use(cookieParser()); // TODO: Signed cookies?
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());
        app.use(methodOverride()); // TODO: What do we use this for?

        // Sessions
        var sessionMiddleware = session.middleware(sessionSecret);
        app.use(sessionMiddleware);

        // Authentication
        app.use(auth.middleware);
        
        // Settings cache
        app.use(settings.middleware);

        // Is this the first run of the system?
        app.use(firstRun);

        // Real-time engine
        app.use(socketSetup(io, sessionMiddleware));

        // Routes
        app.use("/", routes);

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
        httpsPort: 4000
    };

    config = config || defaults;

    config.isDebugging = config.isDebugging || defaults.isDebugging;
    config.httpPort    = config.httpPort || defaults.httpPort;
    config.httpsPort   = config.httpsPort || defaults.httpsPort;

    return config;
}

function ensureCallback (callback) {
    if (!callback) {
        return function() {};
    }
    return callback;
}

exports.express = app;
exports.init = init;
exports.startServer = webServer.start;