// app.js
var express = require('express');
var events  = require('events');
var http    = require('http');
var path    = require('path');
var io      = require('socket.io')();

// routes
var router = require('./router.js');

// express middleware
var compression    = require('compression');
var serveStatic    = require('serve-static');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');

var compactModule = require('compact-exclsr');

var auth   = require('circle-blvd/auth-local');
var errors = require('circle-blvd/errors');
var guard  = errors.guard;
var db     = require('circle-blvd/dataAccess').instance();

var socketSetup = require('circle-blvd/socket-setup');

var session    = require('circle-blvd/session');
var sslServer  = require('circle-blvd/https-server');
var forceHttps = require('circle-blvd/force-https')(sslServer);
var payment    = require('circle-blvd/payment')();
var settings   = require('circle-blvd/settings');

var canonicalDomain = require('circle-blvd/canonical-domain')(settings);
var defaultSettings = require('./back-end/settings');

var ee = new events.EventEmitter();
var isReady = false;

var app = express();


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

// configure Express
var configureApp = function (config) {
    // Default config
    if (!config) {
        config = {
            isDebugging: false
        }
    }

    var isDebugging = config.isDebugging || false;

    app.set('port', process.env.PORT || 3000);
    app.set('ssl-port', process.env.SSL_PORT || 4000);
    
    app.set('views', __dirname + '/front-end/views');
    app.set('view engine', 'jade');

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

    var staticPath = path.join(__dirname, './front-end/public');
    var minJsPath = '/_js';

    // for minifying JavaScript
    var compact = compactModule.createCompact({
        srcPath: staticPath,
        destPath: path.join(staticPath, minJsPath),
        webPath: minJsPath,
        debug: isDebugging
    });

    compact.addNamespace('lib')
        .addJs('lib/angular/angular.js')
        .addJs('lib/angular/angular-route.js')
        .addJs('lib/angular/angular-sanitize.js')
        .addJs('lib/store/store.min.js')
        .addJs('lib/autosize/jquery.autosize.min.js')
        .addJs('lib/typeahead/0.10.2.js');

    compact.addNamespace('app')
        .addJs('main/app.js');

    compact.addNamespace('services')
        .addJs('services/analytics.js')
        .addJs('services/lib.js')
        .addJs('services/hacks.js')
        .addJs('services/signInName.js')
        .addJs('services/session.js')
        .addJs('services/stories.js')
        .addJs('services/errors.js')
        .addJs('main/services.js');

    compact.addNamespace('controllers')
        .addJs('ui/controllers/topLevel.js')
        .addJs('main/controllers.js')
        .addJs('ui/controllers/story.js')
        .addJs('ui/controllers/storyList.js')
        .addJs('ui/controllers/storySummary.js')
        .addJs('ui/controllers/roadmapMilepost.js')
        .addJs('ui/controllers/home.js')
        .addJs('ui/controllers/welcome.js')
        .addJs('ui/controllers/signin.js')
        .addJs('ui/controllers/forgot.js')
        .addJs('ui/controllers/archive.js')
        .addJs('ui/controllers/lists.js')
        .addJs('ui/controllers/listDetail.js')
        .addJs('ui/controllers/profile.js')
        .addJs('ui/controllers/invite.js')
        .addJs('ui/controllers/tour.js')
        .addJs('ui/controllers/contact.js')
        .addJs('ui/controllers/partner.js')
        .addJs('ui/controllers/about.js')
        .addJs('ui/controllers/privacy.js')
        .addJs('ui/controllers/donate.js')
        .addJs('ui/controllers/admin.js')
        .addJs('ui/controllers/createCircle.js')
        .addJs('ui/controllers/removeHash.js')
        .addJs('ui/controllers/mainframe.js')
        .addJs('ui/controllers/fix.js')

    compact.addNamespace('main')
        .addJs('main/filters.js')
        .addJs('main/directives.js')

    // Rudimentary cache handling
    var version = Date.now().toString();
    compact.addNamespace(version);

    app.use(serveStatic(staticPath));

    app.use(compact.middleware([
        'lib', 
        'app', 
        'services', 
        'controllers', 
        'main',
        version
    ]));
    app.use(logger('dev'));
    app.use(cookieParser()); // TODO: Signed cookies?
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(methodOverride()); // TODO: What do we use this for?


    var initSettingsOk = function (settingsTable) {
        var sessionSecret = settingsTable['session-secret'].value;
        
        var sessionMiddleware = session.middleware(sessionSecret);
        app.use(sessionMiddleware);

        var stripeApiKey = settingsTable['stripe-secret-key'];
        if (stripeApiKey) {
            payment.setApiKey(stripeApiKey.value);
        }

        // Init authentication
        auth.attach(app);
        
        // Set settings
        app.use(settings.middleware);

        app.use(function (req, res, next) {
            // Is this our first run? 
            // TODO: We really only need to call this once.
            // It doesn't need to be a middleware. The main
            // thing is that app.isInitializing should be
            // correct all the time.
            var usersExist = function (callback) {
                db.users.count(function (err, count) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, count > 0);
                });
            };
    
            usersExist(guard(res, function (exist) {
                if (!exist) {
                    app.isInitializing = true;
                }
                else {
                    app.isInitializing = false;
                }
                next();
            }));
        });

        // Real-time engine
        socketSetup.init(io, app, sessionMiddleware);

        // Routes
        app.use("/", router);

        // Catch errors
        app.use(function (err, req, res, next) {
            if (err) {
                return errors.handle(err, res);
            }
            // TODO: Should not get here.
        });
        
        ready();
    };

    var onSettingsUpdate = function (setting) {
        if (setting.name === 'ssl-key-path' || setting.name === 'ssl-cert-path') {
            tryToCreateHttpsServer();
        }

        if (setting.name === 'stripe-secret-key') {
            payment.setApiKey(setting.value);
        }
    };

    settings.addListener(onSettingsUpdate);

    settings.init(defaultSettings, function (err, settingsTable) {
        if (err) {
            console.log(err);
        }
        else {
            initSettingsOk(settingsTable);
        }
    });
}; 

function ready() {
    isReady = true;
    ee.emit('circle-blvd-app-is-ready');
}

exports.whenReady = function (callback) {
    if (isReady) {
        return callback();
    }
    ee.once('circle-blvd-app-is-ready', function () {
        callback();
    });
};

exports.express = app;
exports.init = configureApp;
exports.startServer = startServer;