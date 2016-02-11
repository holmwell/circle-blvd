// app.js
var express = require('express');
var events  = require('events');
var http    = require('http');
var path    = require('path');
var io      = require('socket.io')();

// express middleware
var compression    = require('compression');
var serveStatic    = require('serve-static');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var expressSession = require('express-session');
var uidSafe        = require('uid-safe');

var compactModule = require('compact-exclsr');

var auth   = require('circle-blvd/auth-local');
var ensure = require('circle-blvd/auth-ensure');
var limits = require('circle-blvd/limits');
var errors = require('circle-blvd/errors');
var guard  = errors.guard;
var handle = require('circle-blvd/handle');
var send   = require('circle-blvd/send');
var db     = require('circle-blvd/dataAccess').instance();

var socketSetup = require('circle-blvd/socket-setup');

var sslServer = require('circle-blvd/https-server');
var payment   = require('circle-blvd/payment')();
var settings  = require('circle-blvd/settings');
var contact   = require('circle-blvd/contact-emailer');

var defaultSettings = require('./back-end/settings');

// Routes
var usersRoutes = require('./back-end/routes/users');
var userRoutes  = require('./back-end/routes/user');
var initRoutes  = require('./back-end/routes/init');

var authRoutes       = require('./back-end/routes/auth');
var metrics          = require('./back-end/routes/metrics');
var settingsRoutes   = require('./back-end/routes/settings');
var paymentRoutes    = require('./back-end/routes/payment');
var signupRoutes     = require('./back-end/routes/signup');
var circleRoutes     = require('./back-end/routes/circle');
var groupRoutes      = require('./back-end/routes/group');
var baseCircleRoutes = require('./back-end/routes/base-circle');
var storyRoutes      = require('./back-end/routes/story');

var routes   = require('./front-end/routes');
var archives = require('./front-end/routes/archives');
var prelude  = require('./front-end/routes/prelude');

var couchSessionStore = require('circle-blvd/couch-session-store');

var ee = new events.EventEmitter();
var isReady = false;

var app = express();


var tryToCreateHttpsServer = function (callback) {
    sslServer.create(app, callback);
};

var defineRoutes = function () {
    app.use('/', prelude.router);
    app.use('/archives', archives.router);
    app.use('/auth', authRoutes.router(auth));
    app.use('/data/metrics', metrics.router);

    // Search engine things
    app.get('/sitemap.txt', routes.sitemap);
    
    // Email form
    app.post("/data/contact", ensure.auth, contact.handler);

    // User routes (account actions)
    app.get("/data/user", ensure.auth, userRoutes.user);
    app.put("/data/user/name", ensure.auth, userRoutes.updateName);
    app.put("/data/user/email", ensure.auth, userRoutes.updateEmail);
    app.put("/data/user/notificationEmail", ensure.auth, userRoutes.updateNotificationEmail)
    app.put("/data/user/password", ensure.auth, userRoutes.updatePassword);

    // Init routes
    app.put("/data/initialize", initRoutes.init);

    // Settings!
    app.use("/data/settings", settingsRoutes.router);

    // TODO: This function has a lot of dependencies. 
    // Clean up this mess, so we can get it out of this
    // file.
    app.put("/data/setting", ensure.mainframe, function (req, res) {
        var data = req.body;

        var onSettingsUpdate = function (setting) {
            if (setting.name === 'ssl-key-path' || setting.name === 'ssl-cert-path') {
                // TODO: Tell the client if we started the server?
                tryToCreateHttpsServer(function (err) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    if (sslServer.isRunning()) {
                        io.attach(sslServer.getServer());
                    }
                });
            }
            if (setting.name === 'stripe-secret-key') {
                payment.setApiKey(setting.value);
            }

            settings.invalidateCache();
            res.status(200).send();
        };

        db.settings.update(data, guard(res, onSettingsUpdate));;
    });


    // Circles!
    app.get("/data/circles", ensure.auth, function (req, res) {
        db.circles.findByUser(req.user, handle(res));
    });
    app.get("/data/circles/all", ensure.mainframe, send(db.circles.getAll));
    app.use('/data/circle', circleRoutes.router);

    app.get("/data/invite/:inviteId", function (req, res) {
        var inviteId = req.params.inviteId;
        db.invites.get(inviteId, handle(res));
    });

    // Groups!
    app.use('/data/group', groupRoutes.router);

    // Fundamental operations, like stories in a circle.
    app.use('/data', baseCircleRoutes.router);
 
    // Stories!
    app.use('/data/story', storyRoutes.router);

    // TODO: Where should this be on the client?
    app.put("/data/:circleId/settings/show-next-meeting", ensure.circleAdmin, function (req, res) {
        var showNextMeeting = req.body.showNextMeeting;
        var projectId = req.params.circleId;

        var handleNextMeeting = guard(res, function (nextMeeting) {
            if (showNextMeeting) {
                // TODO: Should probably be in the data access layer.
                // TODO: Consider passing in the summary from the client,
                // as 'meeting' should be a configurable word.
                var story = {};
                story.summary = "Next";
                story.isNextMeeting = true;

                storyRoutes.addStory(story, res);
            }
            else {
                storyRoutes.removeStory(nextMeeting, res);
            }
        });

        var nextMeeting = db.stories.getNextMeetingByProjectId(projectId, handleNextMeeting);
    });

    app.use('/payment', paymentRoutes.router);
    app.use('/data/signup', signupRoutes.router);

    app.get("/data/waitlist", ensure.mainframe, send(db.waitlist.get));

    // The secret to bridging Angular and Express in a 
    // way that allows us to pass any path to the client.
    // 
    // Also, this depends on the static middleware being
    // near the top of the stack.
    app.get('*', function (req, res) {
        routes.index(req, res, app);
    });
};


var startServer = function () {
    var httpServer = http.createServer(app);

    httpServer.listen(app.get('port'), function () {
        console.log("Express http server listening on port " + app.get('port'));
        io.attach(httpServer);
    });

    // Run an https server if we can.
    tryToCreateHttpsServer(function (err, success) {
        if (err) {
            console.log(err);
        }
        else {
            console.log(success);
            if (sslServer.isRunning()) {
                io.attach(sslServer.getServer());
            }
        }
    });
};

var forceHttps = function(req, res, next) {
    if (!sslServer.isRunning()) {
        // Don't do anything if we can't do anything.
        return next();
    }

    if(req.secure 
        || req.headers['x-forwarded-proto'] === 'https' 
        || req.hostname === "localhost") {
        return next();  
    }
    res.redirect('https://' + req.get('Host') + req.url);
};


var canonicalDomain = function (req, res, next) {
    if (!settings) {
        return next();
    }

    settings.get(function (err, settingsTable) {
        if (err) {
            return next(err);
        }
        if (!settingsTable) {
            return next();
        }

        var domainName = undefined;
        if (settingsTable['domain-name'] && settingsTable['domain-name'].value) {
            domainName = settingsTable['domain-name'].value.trim();
        }

        if (!domainName || req.hostname === domainName) {
            return next();
        }

        var hostAndPort = req.get('Host');
        var redirectToHost = domainName;
        if (hostAndPort) {
            redirectToHost = hostAndPort.replace(req.hostname, domainName);
        }

        var url = req.protocol + "://" + redirectToHost + req.originalUrl;
        res.redirect(307, url);

    });
   
};

var getCookieSettings = function () {
    // TODO: Check settings to guess if https is running.
    // Or actually figure out if https is running, and if so
    // use secure cookies
    var oneHour = 3600000;
    var oneWeek = 7 * 24 * oneHour;
    var sixWeeks = 6 * oneWeek;
    var cookieSettings = {
        path: '/',
        httpOnly: true,
        secure: false,
        maxAge: sixWeeks
    };

    return cookieSettings;
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
        var SessionStore = couchSessionStore(expressSession);
        var cookieSettings = getCookieSettings();
        var sessionMiddleware = expressSession({ 
            store: new SessionStore(),
            secret: sessionSecret,
            cookie: cookieSettings,
            // TODO: We might want resave to be false
            // More info: https://github.com/expressjs/session#options
            resave: true,
            saveUninitialized: true,
            // Do not allow session IDs to start with an underscore. 
            // CouchDB does not allow us to use document IDs that start with _.
            genid: function (req) {
                var id = undefined;
                while (!id) {
                    id = uidSafe.sync(24);
                    if (id[0] === "_") {
                        id = undefined;
                    }
                }
                return id;
            }
        });
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
        defineRoutes();

        // Catch errors
        app.use(function (err, req, res, next) {
            if (err) {
                return errors.handle(err, res);
            }
            // TODO: Should not get here.
        });
        
        ready();
    };

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