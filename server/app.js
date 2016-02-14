// app.js
var express = require('express');

// express middleware
var compression    = require('compression');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');

// routes
var router       = require('./router.js');
var staticRouter = require('./static.js');

// circle-blvd modules
var auth   = require('circle-blvd/auth-local');
var errors = require('circle-blvd/errors');

var firstRun    = require('circle-blvd/first-run');
var socketSetup = require('circle-blvd/socket-setup');
var session     = require('circle-blvd/session');

var payment    = require('circle-blvd/payment')();
var settings   = require('circle-blvd/settings');

var canonicalDomain = require('circle-blvd/canonical-domain')(settings);
var defaultSettings = require('./back-end/settings');

var app        = express();
var io         = require('socket.io')();
var webServer  = require('./web-server.js')(app, io);
var forceHttps = require('circle-blvd/force-https')(webServer.https);

// configure Express
var init = function (config, callback) {
    // Default config
    if (!config) {
        config = {
            isDebugging: false,
            httpPort: 3000,
            httpsPort: 4000
        }
    }
    if (!callback) {
        callback = function () {};
    }

    var isDebugging = config.isDebugging || false;

    webServer.setPort(config.httpPort || 3000);
    webServer.https.setPort(config.httpsPort || 4000);
    
    // Views and view engines
    app.set('views', __dirname + '/front-end/views');
    app.set('view engine', 'jade');

    // For index.ejs. On its way out.
    app.engine('ejs', require('ejs').__express);
    
    // TODO: canonicalDomain will not work for the first request
    // after the settings are changed.
    //
    // Canonical domain needs to be before https, otherwise 
    // a browser will try to use the canonical https certificate
    // to connect to the non-canonical domain
    app.use(canonicalDomain);
    app.use(forceHttps);
    
    app.use(compression());

    // Use CORS on port 8100 for local dev / debug runs
    // This is the default port for Ionic
    if (isDebugging) {
        app.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "http://localhost:8100");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
            // Further, to allow cookies over CORS, we need:
            res.header("Access-Control-Allow-Credentials", "true");
            next();
        });
    }

    app.use(staticRouter(isDebugging));

    app.use(logger('dev'));
    app.use(cookieParser()); // TODO: Signed cookies?
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(methodOverride()); // TODO: What do we use this for?

    settings.addListener(onSettingsUpdate);

    settings.init(defaultSettings, function (err, settingsTable) {
        if (err) {
            callback(err);                
            return;
        }

        processSettings(settingsTable);
        callback();
    });

    function processSettings (settingsTable) {

        var stripeApiKey = settingsTable['stripe-secret-key'];
        if (stripeApiKey) {
            payment.setApiKey(stripeApiKey.value);
        }

        // Sessions
        var sessionSecret     = settingsTable['session-secret'].value;
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
        app.use("/", router);

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

exports.express = app;
exports.init = init;
exports.startServer = webServer.start;