// router.js
var express = require('express');
var router = express.Router();

// Dependencies
var auth   = require('circle-blvd/auth-local');
var ensure = require('circle-blvd/auth-ensure');
var errors = require('circle-blvd/errors');
var guard  = errors.guard;
var handle = require('circle-blvd/handle');
var send   = require('circle-blvd/send');

var db = require('circle-blvd/dataAccess').instance();

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

var contact = require('circle-blvd/contact-emailer');

router.use('/', prelude.router);
router.use('/archives', archives.router);
router.use('/auth', authRoutes.router(auth));
router.use('/data/metrics', metrics.router);

// Search engine things
router.get('/sitemap.txt', routes.sitemap);

// Email form
router.post("/data/contact", ensure.auth, contact.handler);

// User routes (account actions)
router.get("/data/user", ensure.auth, userRoutes.user);
router.put("/data/user/name", ensure.auth, userRoutes.updateName);
router.put("/data/user/email", ensure.auth, userRoutes.updateEmail);
router.put("/data/user/notificationEmail", ensure.auth, userRoutes.updateNotificationEmail)
router.put("/data/user/password", ensure.auth, userRoutes.updatePassword);

// Init routes
router.put("/data/initialize", initRoutes.init);

// Settings!
router.use("/data/settings", settingsRoutes.router);

// Circles!
router.get("/data/circles", ensure.auth, function (req, res) {
    db.circles.findByUser(req.user, handle(res));
});
router.get("/data/circles/all", ensure.mainframe, send(db.circles.getAll));
router.use('/data/circle', circleRoutes.router);

router.get("/data/invite/:inviteId", function (req, res) {
    var inviteId = req.params.inviteId;
    db.invites.get(inviteId, handle(res));
});

// Groups!
router.use('/data/group', groupRoutes.router);

// Fundamental operations, like stories in a circle.
router.use('/data', baseCircleRoutes.router);

// Stories!
router.use('/data/story', storyRoutes.router);

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

router.use('/payment', paymentRoutes.router);
router.use('/data/signup', signupRoutes.router);

router.get("/data/waitlist", ensure.mainframe, send(db.waitlist.get));

// The secret to bridging Angular and Express in a 
// way that allows us to pass any path to the client.
// 
// Also, this depends on the static middleware being
// near the top of the stack.
router.get('*', function (req, res) {
    routes.index(req, res, req.app);
});

module.exports = router;