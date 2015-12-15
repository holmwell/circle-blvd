// app.js
var express = require('express');
var events  = require('events');
var http    = require('http');
var path    = require('path');
var routes  = require('./front-end/routes');
var io      = require('socket.io')();

// express middleware
var compression    = require('compression');
var serveStatic    = require('serve-static');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var expressSession = require('express-session');

var compactModule = require('compact-exclsr');

var auth   = require('circle-blvd/auth-local');
var ensure = require('circle-blvd/auth-ensure');
var limits = require('circle-blvd/limits');
var errors = require('circle-blvd/errors');
var handle = require('circle-blvd/handle');
var db     = require('circle-blvd/dataAccess').instance();
var notify = require('circle-blvd/notify');

var sslServer = require('circle-blvd/https-server');
var payment   = require('circle-blvd/payment')();
var settings  = require('circle-blvd/settings');
var contact   = require('circle-blvd/contact-emailer');

// Routes
var usersRoutes = require('./back-end/routes/users');
var userRoutes  = require('./back-end/routes/user');
var initRoutes  = require('./back-end/routes/init');

// Express 4.x routes
var archives = require('./front-end/routes/archives');
var prelude = require('./front-end/routes/prelude');

var authRoutes = require('./back-end/routes/auth');
var metrics = require('./back-end/routes/metrics');
var paymentRoutes = require('./back-end/routes/payment');
var signupRoutes = require('./back-end/routes/signup');
var circleRoutes = require('./back-end/routes/circle');

var couchSessionStore = require('circle-blvd/couch-session-store');

var ee = new events.EventEmitter();
var isReady = false;

var app = express();


// Middleware for data access
var guard = errors.guard;

var send = function (fn) {
    var middleware = function (req, res, next) {
        fn(handle(res));
    };

    return middleware;
};

var data = function (fn) {
    // A generic guard for callbacks. Call the
    // fn parameter. If there is an error, pass
    // it up to the error handler. Otherwise
    // append the result to the request object,
    // for the next middleware in line.
    var middleware = function (req, res, next) {
        fn(guard(res, function (data) {
            if (req.data) {
                // TODO: programmer error
            }
            req.data = data;
            next();
        }));
    };

    return middleware;
};

// caching middleware
var cache = function (ms) {
    var fn = function (req, res, next) {
        res.setHeader("Cache-Control", "max-age=" + ms);
        next();
    };
    return fn;
};
var sixMinutes = 5 * 60;

var tryToCreateHttpsServer = function (callback) {
    sslServer.create(app, callback);
};

var defineRoutes = function () {
    app.use('/', prelude.router(app));
    app.use('/archives', archives.router(app));
    app.use('/auth', authRoutes.router(auth, app));

    app.use('/data/metrics', metrics.router(app));

    // Search engine things
    app.get('/sitemap.txt', routes.sitemap);

    app.post("/data/contact", ensure.auth, function (req, res) {
        var envelope = req.body;
        var user = req.user;
        if (user.notifications && user.notifications.email) {
            envelope.from = user.notifications.email;
        }
        else {
            envelope.from = email;
        }
        contact.sendEmail(envelope, handle(res)); 
    });

    // User routes (account actions. requires login access)
    app.get("/data/user", ensure.auth, userRoutes.user);
    app.put("/data/user/name", ensure.auth, userRoutes.updateName);
    app.put("/data/user/email", ensure.auth, userRoutes.updateEmail);
    app.put("/data/user/notificationEmail", ensure.auth, userRoutes.updateNotificationEmail)
    app.put("/data/user/password", ensure.auth, userRoutes.updatePassword);


    // User routes (circle actions. requires admin access)
    app.get("/data/:circleId/invites", ensure.circleAdmin, function (req, res) {
        var circleId = req.params.circleId;
        db.invites.findByCircleId(circleId, handle(res));
    });

    app.get("/data/:circleId/members", ensure.circleAdmin, function (req, res) {
        var circleId = req.params.circleId;
        db.users.findByCircleId(circleId, handle(res));
    });

    app.put("/data/:circleId/member/remove", ensure.circleAdmin, function (req, res) {
        var circleId = req.params.circleId;
        var reqUser = req.body;
        db.users.removeMembership(reqUser, circleId, handle(res));
    });

    app.put("/data/:circleId/member/groups", ensure.circleAdmin, function (req, res) {
        var circleId = req.params.circleId;
        var member = req.body;
        if (!member.groups) {
            res.status(400).send();
            return;
        }

        var groups = member.groups;
        db.users.updateGroups(member, circleId, groups, handle(res));
    });

    app.get("/data/:circleId/members/names", ensure.circle, function (req, res) {
        var circleId = req.params.circleId;
        db.users.findNamesByCircleId(circleId, handle(res));
    });

    // Init routes
    app.put("/data/initialize", initRoutes.init);


    // Settings!
    app.get("/data/settings", cache(sixMinutes), send(db.settings.get)); // public

    // TODO: This is not used. Assess.
    app.get("/data/settings/private", 
        ensure.mainframe, send(db.settings.getPrivate)); 

    app.get("/data/settings/authorized", 
        ensure.mainframe, send(db.settings.getAuthorized));

    app.put("/data/setting", ensure.mainframe, function (req, res) {
        var data = req.body;

        var invalidateSettingsCache = function () {
            app.set('settings', null);
        };

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

            invalidateSettingsCache();
            res.status(200).send();
        };

        db.settings.update(data, guard(res, onSettingsUpdate));;
    });


    // Circles!
    app.get("/data/circles", ensure.auth, function (req, res) {
        db.circles.findByUser(req.user, handle(res));
    });

    app.get("/data/circles/all", 
        ensure.mainframe, 
        send(db.circles.getAll));

    app.use('/data/circle', circleRoutes.router(app));


    app.get("/data/invite/:inviteId", function (req, res) {
        var inviteId = req.params.inviteId;
        db.invites.get(inviteId, handle(res));
    });

    // Groups!
    app.get("/data/:circleId/groups", ensure.circle, function (req, res) {
        var circleId = req.params.circleId;
        db.groups.findByProjectId(circleId, handle(res));
    });

    // TODO: We'll turn groups on at a later time, as we
    // transition toward hosting larger groups, but in the 
    // mean time this is just a security hole.
    //
    // TODO: Ensure circle access
    // app.post("/data/group", ensureAdministrator, function (req, res) {
    //  var data = req.body;

    //  var group = {}; 
    //  group.projectId = data.projectId;
    //  group.name = data.name;

    //  db.groups.add(group, handle(res));
    // });

    // // TODO: Ensure circle access
    app.get("/data/group/:groupId", ensure.auth, function (req, res) {
        var groupId = req.params.groupId;
        db.groups.findById(groupId, handle(res));
    });

    // // TODO: Ensure circle access
    // app.put("/data/group/remove", ensureAdministrator, function (req, res) {
    //  var group = req.body;

    //  db.groups.remove(group, 
    //      function () {
    //          res.status(200).send();
    //      },
    //      function (err) {
    //          errors.handle(err, res);
    //      }
    //  );
    // });


    // Story routes
    app.get("/data/:circleId/stories", ensure.circle, function (req, res) {
        var circleId = req.params.circleId;
        db.stories.findByListId(circleId, handle(res));
    });

    // TODO: combine this with /stories to return one object with 
    // both the story list and the first story (in two different things)
    app.get("/data/:circleId/first-story", ensure.circle, function (req, res) {
        var circleId = req.params.circleId;
        db.stories.getFirstByProjectId(circleId, handle(res));
    });

    app.get("/data/:circleId/archives", ensure.circle, function (req, res) {
        var circleId = req.params.circleId;
        var query = req.query;
        var defaultLimit = 251; // TODO: Settings

        var limit = query.limit || defaultLimit;
        var startkey = query.startkey;
        var params = {
            limit: limit,
            startkey: startkey
        };

        db.archives.findByCircleId(circleId, params, handle(res));
    });

    app.get("/data/:circleId/archives/count", ensure.circle, function (req, res) {
        var circleId = req.params.circleId;
        db.archives.countByCircleId(circleId, guard(res, function (count) {
            res.status(200).send(count.toString());
        }));
    });


    // Checklists!
    app.post("/data/:circleId/list", ensure.circle, function (req, res) {
        var list = {
            name: req.body.name,
            description: req.body.description,
            circleId: req.params.circleId
        };

        limits.lists(list.circleId, guard(res, function () {
            db.lists.add(list, handle(res));    
        }));
    });

    app.get("/data/:circleId/lists", ensure.circle, function (req, res) {
        var circleId = req.params.circleId;
        db.lists.byCircleId(circleId, handle(res));
    });

    app.get("/data/:circleId/:listId/stories", ensure.circle, function (req, res) {
        var circleId = req.params.circleId;
        var listId = req.params.listId;
        db.stories.findByListId(listId, handle(res));
    });

    app.get("/data/:circleId/:listId/first-story", ensure.circle, function (req, res) {
        var listId = req.params.listId;
        db.stories.getFirstByProjectId(listId, handle(res));
    });

    var copyStory = function (story) {
        var copy = {};
        
        copy.projectId = story.projectId;
        copy.listId = story.listId;
        
        copy.summary = story.summary;
        copy.description = story.description;
        copy.owner = story.owner;
        copy.status = story.status;
        copy.labels = story.labels;

        copy.isDeadline = story.isDeadline;
        copy.isNextMeeting = story.isNextMeeting;

        copy.createdBy = story.createdBy;
        copy.nextId = story.nextId;

        return copy;
    };

    var addStory = function (story, res) {
        ioNotify(res, story.projectId, 'story-add', story);
        db.stories.add(story, handle(res));
    };

    var getCreatedBy = function (req) {
        var createdBy = undefined;
        if (req.user) {
            createdBy = {
                name: req.user.name,
                id: req.user._id
            };
        }

        return createdBy;
    };

    // TODO: Ensure that the circleId specified in this
    // story is valid. Otherwise people can hack around
    // ways of accessing stories.
    //
    // This might be a thing to do at the data layer, or
    // we could do it higher up by getting the story
    // from the database and comparing the projectId to
    // the one specified, which might be a cleaner approach.
    app.post("/data/story/", ensure.auth, function (req, res) {
        var data = req.body;
        var circleId = data.projectId;

        ensure.isCircle(circleId, req, res, function() {
            // Add the story if we're under the server limit.
            limits.users.story(circleId, guard(res, function () {

                var story = copyStory(data);
                story.createdBy = getCreatedBy(req);
                // console.log("STORY: ");
                // console.log(story);
                addStory(story, res);
            }));
        });
    });

    var getComment = function (text, req) {
        var comment = {
            text: text,
            createdBy: getCreatedBy(req),
            timestamp: Date.now()
        };

        return comment;
    };

    var saveStoryWithComment = function (story, req, res) {
        ioNotify(res, story.projectId, 'story-save', story);
        db.stories.save(story, 
            function (savedStory) {
                if (story.newComment) {
                    var params = {
                        story: savedStory,
                        comment: story.newComment,
                        user: req.user
                    };
                    notify.newComment(params, req); 
                }
                res.status(200).send(savedStory);
            },
            function (err) {
                errors.handle(err, res);
            }
        );
    };

    app.put("/data/story/", ensure.auth, function (req, res) {
        var story = req.body;
        var commentText = undefined;
        ensure.isCircle(story.projectId, req, res, function () {
            // TODO: This is an opportunity to clean up the API?
            // In other words, add /data/story/comment? Maybe.
            if (story.newComment) {
                story.newComment = getComment(story.newComment, req);
            }
            saveStoryWithComment(story, req, res);
        }); 
    });

    app.put("/data/story/comment", ensure.auth, function (req, res) {
        // circleId, storyId, comment
        var data = req.body;
        if (!data.circleId || !data.storyId || !data.comment) {
            return res.status(400).send("Missing circleId, storyId or comment.");
        }

        ensure.isCircle(data.circleId, req, res, function () {
            db.docs.get(data.storyId, guard(res, function (story) {
                if (story.projectId !== data.circleId) {
                    return res.status(400).send();
                }

                story.newComment = getComment(data.comment, req);
                saveStoryWithComment(story, req, res);
            }));
        });
    });

    app.get("/data/story/:storyId", ensure.auth, function (req, res) {
        var storyId = req.params.storyId;
        if (!storyId) {
            return res.status(400).send("Story id required.");
        }

        db.docs.get(storyId, guard(res, function (story) {
            if (!story || story.type !== "story") {
                return res.status(400).send("Story not found");
            }

            var circleId = story.projectId;
            ensure.isCircle(circleId, req, res, function () {
                res.status(200).send(story);
            });
        }));
    });

    app.put("/data/story/fix", ensure.auth, function (req, res) {
        var body = req.body;
        var story = body.story;
        var newNextId = body.newNextId;
        ensure.isCircle(story.projectId, req, res, function () {
            story.nextId = newNextId;
            db.stories.fix(story, function (response) {
                res.status(200).send(response);
            },
            function (err) {
                errors.handle(err, res);
            });
        });
    });

    app.put("/data/story/move", ensure.auth, function (req, res) {
        var body = req.body;
        var story = body.story;
        var newNextId = body.newNextId;
        ensure.isCircle(story.projectId, req, res, function () {
            ioNotify(res, story.projectId, 'story-move-block', {
                startStoryId: story.id,
                endStoryId: story.id,
                newNextId: newNextId
            });
            db.stories.move(story, newNextId, handle(res));
        });
    });

    app.put("/data/story/move-block", ensure.auth, function (req, res) {
        var body = req.body;

        var startStory = body.startStory;
        var endStory = body.endStory;
        var newNextId = body.newNextId;

        ensure.isCircle(startStory.projectId, req, res, function () {
            ensure.isCircle(endStory.projectId, req, res, function () {
                ioNotify(res, startStory.projectId, 'story-move-block', {
                    startStoryId: startStory.id,
                    endStoryId: endStory.id,
                    newNextId: newNextId
                });
                db.stories.moveBlock(startStory, endStory, newNextId, handle(res));
            });
        });
    });

    var removeStory = function (story, res) {
        // FYI: This happens for both deleted stories and archived
        // stories. We might want to distinguish between the two.
        ioNotify(res, story.projectId, 'story-remove', story);
        db.stories.remove(story, handle(res));
    };

    app.put("/data/story/archive", ensure.auth, function (req, res) {
        var story = req.body;
        ensure.isCircle(story.projectId, req, res, function () {
            limits.archives(story.projectId, guard(res, function () {
                var stories = [];
                stories.push(story);

                db.archives.addStories(stories, 
                function (body) {
                    // TODO: If this breaks then we have a data
                    // integrity issue, because we have an archive
                    // of a story that has not been deleted.
                    removeStory(story, res);
                }, 
                function (err) {
                    errors.handle(err, res);
                });
            }));
        });
    });

    app.put("/data/story/remove", ensure.auth, function (req, res) {
        var story = req.body;
        ensure.isCircle(story.projectId, req, res, function () {
            removeStory(story, res);
        });
    });


    app.post("/data/story/notify/new", ensure.auth, function (req, res) {
        var story = req.body;
        var sender = req.user;
        ensure.isCircle(story.projectId, req, res, function () {
            notify.newStory(story, sender, req, handle(res));
        });
    });

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

                addStory(story, res);
            }
            else {
                removeStory(nextMeeting, res);
            }
        });

        var nextMeeting = db.stories.getNextMeetingByProjectId(projectId, handleNextMeeting);
    });

    app.use('/payment', paymentRoutes.router(app));
    app.use('/data/signup', signupRoutes.router(app));

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

var initSocketIO = function (sessionMiddleware) {
    io.use(function (socket, next) {
        sessionMiddleware(socket.request, {}, next);
    });

    io.use(function (socket, next) {
        // Add our user to the request, if we can.
        if (socket && 
            socket.request && 
            socket.request.session && 
            socket.request.session.passport && 
            socket.request.session.passport.user) {
            var user = socket.request.session.passport.user;
            auth.findUser(user, function (err, user) {
                if (err) {
                    return next(err);
                }
                socket.request.user = user;
                next();
            });
        }
        else {
            next();
        }
    });

    function hasAccessToCircle(user, circleId) {
        var hasAccess = false;

        // Only allow access circle events if
        // we're members of some sort.
        if (user && user.memberships) {
            var groups = user.memberships;
            for (var groupKey in groups) {
                if (groups[groupKey].circle === circleId) {
                    hasAccess = true;
                }
            }
        }

        return hasAccess;
    }

    io.on('connection', function (socket) {
        socket.on('join-circle', function (data) {
            if (!data.circle) {
                // No circle specified
                return;
            }

            if (hasAccessToCircle(socket.request.user, data.circle)) {
                socket.join(data.circle);
            }
            else {
                socket.join(data.circle + "-guest");
            }
        });

        socket.on('story-highlighted', function (data) {
            var user = socket.request.user;
            var circleId = data.circle;
            var storyId = data.storyId;
            
            if (hasAccessToCircle(user, circleId)) {
                io.to(circleId).emit('story-highlighted', {
                    data: {
                        storyId: storyId
                    },
                    user: user.name
                });
            }
        });
    });

    app.use(function (req, res, next){
        res.on('finish', function(){
            if (res.circleBlvd && res.circleBlvd.notifyCircle) {
                var circleId = res.circleBlvd.notifyCircle;
                if (res.circleBlvd.notifyType) {
                    var payload = {};
                    // Attached the signed in user to the payload
                    if (req.user) {
                        payload.user = req.user.name;
                    }
                    payload.data = res.circleBlvd.notifyData;
                    io.to(circleId).emit(res.circleBlvd.notifyType, payload);
                }

                // Always emit a ping to guest listeners.
                // This is basically a workaround for mobile
                // clients until we develop a more proper solution.
                var circleGuests = circleId + "-guest";
                io.to(circleGuests).emit('o');
            }
        });
        next();
    });
};

var ioNotify = function (res, circleId, type, data) {
    if (!res.circleBlvd) {
        res.circleBlvd = {};
    }
    res.circleBlvd.notifyCircle = circleId;
    res.circleBlvd.notifyType = type;
    res.circleBlvd.notifyData = data;
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
        || req.host === "localhost") {
        return next();  
    }
    res.redirect('https://' + req.get('Host') + req.url);
};

var appSettings = function (req, res, next) {
    if (!app.get('settings')) {
        db.settings.getAll(function (err, settings) {
            if (err) {
                errors.log(err);
                return next();
            }
            app.set('settings', settings);
            next();
        });
    }
    else {
        next();
    }
};

var canonicalDomain = function (req, res, next) {
    var settings = app.get('settings');
    if (!settings) {
        return next();
    }

    var domainName = undefined;
    if (settings['domain-name'] && settings['domain-name'].value) {
        domainName = settings['domain-name'].value.trim();
    }

    if (!domainName || req.host === domainName) {
        return next();
    }

    var hostAndPort = req.get('Host');
    var redirectToHost = domainName;
    if (hostAndPort) {
        redirectToHost = hostAndPort.replace(req.host, domainName);
    }

    var url = req.protocol + "://" + redirectToHost + req.originalUrl;
    res.redirect(307, url);
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

    var initSettingsOk = function (settings) {
        var sessionSecret = settings['session-secret'].value;
        var SessionStore = couchSessionStore(expressSession);
        var cookieSettings = getCookieSettings();
        var sessionMiddleware = expressSession({ 
            store: new SessionStore(),
            secret: sessionSecret,
            cookie: cookieSettings
        });
        app.use(sessionMiddleware);

        var stripeApiKey = settings['stripe-secret-key'];
        if (stripeApiKey) {
            payment.setApiKey(stripeApiKey.value);
        }

        // Init authentication
        auth.attach(app);
        
        // Set settings
        app.use(appSettings);

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
        initSocketIO(sessionMiddleware);

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

    settings.init(function (err, settings) {
        if (err) {
            console.log(err);
        }
        else {
            initSettingsOk(settings);
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