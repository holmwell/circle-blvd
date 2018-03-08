// router.js
var express = require('express');
var router = express.Router();

// Dependencies
var ensure = require('circle-blvd/auth-ensure');
var errors = require('@holmwell/errors');
var guard  = errors.guard;
var handle = require('circle-blvd/handle');
var send   = require('circle-blvd/send');

// Routes
var userRoutes  = require('./routes/user');
var initRoutes  = require('./routes/init');

var authRoutes       = require('./routes/auth');
var metrics          = require('./routes/metrics');
var settingsRoutes   = require('./routes/settings');
var paymentRoutes    = require('./routes/payment');
var signupRoutes     = require('./routes/signup');
var circleRoutes     = require('./routes/circle');
var groupRoutes      = require('./routes/group');
var baseCircleRoutes = require('./routes/base-circle');
var storyRoutes      = require('./routes/story');
var ioRoutes         = require('./routes/io');
var oauthRoutes      = require('./routes/oauth');

var routes   = require('../front-end/routes');
var prelude  = require('../front-end/routes/prelude');

module.exports = function (sessionMaker, db) {
    var auth    = require('circle-blvd/auth-local')(db);
    var payment = require('circle-blvd/payment')(db);
    var contact = require('circle-blvd/contact-emailer')(db.settings);
    
    router.use('/', prelude.router);
    router.use('/auth', authRoutes.router(auth, sessionMaker, db));
    router.use('/data/metrics', metrics(db).router);

    // Search engine things
    router.get('/sitemap.txt', routes.sitemap);

    // Email form
    router.post("/data/contact", ensure.auth, contact.handler);

    // User routes (account actions)
    router.get("/data/user", ensure.auth, userRoutes(db).user);
    router.put("/data/user/name", ensure.auth, userRoutes(db).updateName);
    router.put("/data/user/email", ensure.auth, userRoutes(db).updateEmail);
    router.put("/data/user/notificationEmail", ensure.auth, userRoutes(db).updateNotificationEmail)
    router.put("/data/user/password", ensure.auth, userRoutes(db).updatePassword);

    // Init routes
    router.put("/data/initialize", function (req, res) {
        initRoutes.init(req, res, req.app, db);
    });

    // Settings!
    router.use("/data/settings", settingsRoutes(db).router);

    // Circles!
    router.get("/data/circles", ensure.auth, function (req, res) {
        db.circles.findByUser(req.user, handle(res));
    });
    router.get("/data/circles/all", ensure.mainframe, send(db.circles.getAll));
    router.use('/data/circle', circleRoutes(db).router);

    router.get("/data/invite/:inviteId", function (req, res) {
        var inviteId = req.params.inviteId;
        db.invites.get(inviteId, handle(res));
    });

    // Groups!
    router.use('/data/group', groupRoutes(db).router);

    // Fundamental operations, like stories in a circle.
    router.use('/data', baseCircleRoutes(db).router);

    // Stories!
    router.use('/data/story', storyRoutes(db).router);

    // TODO: Where should this be on the client?
    router.put("/data/:circleId/settings/show-next-meeting", ensure.circleAdmin, function (req, res) {
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

    router.use('/payment', paymentRoutes(payment).router);
    router.use('/data/signup', signupRoutes(db).router);

    router.get("/data/waitlist", ensure.mainframe, send(db.waitlist.get));

    // Slack!
    router.use('/io', ioRoutes(db).router);
    router.use('/oauth', oauthRoutes(db).router);

    // The secret to bridging Angular and Express in a 
    // way that allows us to pass any path to the client.
    // 
    // Also, this depends on the static middleware being
    // near the top of the stack.
    router.get('*', function (req, res) {
        routes.index(req, res, req.app);
    });

    return router;
};