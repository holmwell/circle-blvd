// Routes for circle creation, settings
// /data/circle

var express = require('express');
var stylus = require('stylus');
var Color  = require('color');
var router = express.Router();

var db = require('circle-blvd/dataAccess').instance();
var errors = require('circle-blvd/errors');
var ensure = require('circle-blvd/auth-ensure');

var guard = errors.guard;
var handle = require('circle-blvd/handle');
var limits = require('circle-blvd/limits');
var notify = require('circle-blvd/notify');

router.post("/", 
    ensure.auth, limits.circle, limits.users.circle, function (req, res) {
    //
    var circleName = req.body.name;
    var user = req.user;

    if (!circleName) {
        var message = "A 'name' property is required, for naming the circle.";
        return res.status(400).send(message);
    }

    db.circles.create(circleName, user.email, handle(res));
});

router.post("/admin", ensure.mainframe, function (req, res) {
    var circle = req.body.circle;
    var admin = req.body.admin;

    if (!admin.email) {
        var message = "An email address for an administrative user " +
            "is required when making a circle.";
        return res.status(400).send(message);
    }

    db.circles.create(circle.name, admin.email, handle(res));
});

router.put("/", ensure.mainframe, function (req, res) {
    var circle = req.body;
    db.circles.update(circle, handle(res));
});

router.get("/:circleId", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    db.circles.get(circleId, handle(res));
});

router.get("/:circleId/standing", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    var settings = req.app.get('settings');
    db.circles.getStanding(circleId, settings, handle(res));
});

router.put("/:circleId/name", ensure.circleAdmin, function (req, res) {
    var data = req.body;
    var circleId = req.params.circleId;
    db.circles.get(circleId, guard(res, function (circle) {
        circle.name = data.name;
        db.circles.update(circle, handle(res));
    }));
});

router.put("/:circleId/archive", ensure.circleAdmin, function (req, res) {
    var circleId = req.params.circleId;
    var isArchived = req.body.isArchived;
    db.circles.get(circleId, guard(res, function (circle) {
        circle.isArchived = isArchived;
        db.circles.update(circle, handle(res));
    }));
});

router.get("/:circleId/custom.css", ensure.circle, function (req, res) {
    // TODO: This is problematic. Should this be on the front end?
    // We need data access, though.
    var circleId = req.params.circleId;
    db.circles.get(circleId, guard(res, function (circle) {
        
        var cssFile = "" +
        ".deadline," +
        ".deadline:hover," +
        ".deadline.after-meeting," +
        ".deadline.after-meeting:hover {" +
        "    color: deadlineColor;" +
        "    background-color: deadlineBackground;" +
        "}";

        // TODO: Future styles
        // ".header," +
        // ".container-fluid.header-inner {" +
        // "    background-color: #ccc" +
        // "}";

        // TODO: The 'has-custom-color' class was added
        // to story elements with custom colors, in our
        // jQuery solution.
        //
        // So, we'll want to make these dynamic, maybe.
        // 
        // .has-custom-color .story-label {
        //   color: inherit !important; 
        // }
        // .has-custom-color .story-label:before {
        //   content: "#";
        // }

        // These are invalid colors and that's what we want.
        var deadlineColor = 'none';
        var deadlineBackground = 'none';

        try {
            if (circle 
             && circle.colors 
             && circle.colors.mileposts) {
                if (circle.colors.mileposts.foreground) {
                    deadlineColor = Color(circle.colors.mileposts.foreground).hexString();
                }
                if (circle.colors.mileposts.background) {
                    deadlineBackground = Color(circle.colors.mileposts.background).hexString();
                }
            }            
        } 
        catch (e) {
            // Don't care.
        }

        stylus(cssFile)
        .set('filename', '/data/circle/' + circleId + '/custom.css')
        .define('deadlineColor', new stylus.nodes.Literal(deadlineColor))
        .define('deadlineBackground', new stylus.nodes.Literal(deadlineBackground))
        .render(guard(res, function (css) {
            res.setHeader('Content-Type', 'text/css');
            res.status(200).send(css);
        }));
    }));
});

router.put("/:circleId/colors/mileposts", ensure.circleAdmin, function (req, res) {
    var data = req.body;
    var circleId = req.params.circleId;
    db.circles.get(circleId, guard(res, function (circle) {
        circle.colors = circle.colors || {};
        circle.colors.mileposts = {
            foreground: data.foreground || "",
            background: data.background || ""
        };
        db.circles.update(circle, handle(res));
    }));
});

// Invites!
router.post("/:circleId/invite", ensure.circleAdmin, function (req, res) {
    var data = req.body;

    var invite = {
        circleId: req.params.circleId,
        count: 1,
        name: data.name
    };

    if (data.email) {
        invite.email = data.email;
    }

    db.invites.create(invite, guard(res, function (dbInvite) {
        if (!dbInvite.email) {
            res.status(200).send(dbInvite);
            return;
        }

        // Send a notification (email) to the person invited.
        var params = {
            user: req.user,
            invite: dbInvite
        };

        notify.invitation(params, req, guard(res, function () {
            res.status(200).send(dbInvite);
        }));
    }));
});

// Who has been invited to join the circle
router.get("/:circleId/invites", ensure.circleAdmin, function (req, res) {
    var circleId = req.params.circleId;
    db.invites.findByCircleId(circleId, handle(res));
});

// Member list, with all details
router.get("/:circleId/members", ensure.circleAdmin, function (req, res) {
    var circleId = req.params.circleId;
    db.users.findByCircleId(circleId, handle(res));
});

// Remove a member from the circle
router.put("/:circleId/member/remove", ensure.circleAdmin, function (req, res) {
    var circleId = req.params.circleId;
    var reqUser = req.body;
    db.users.removeMembership(reqUser, circleId, handle(res));
});

// Update the groups of a member in the circle
router.put("/:circleId/member/groups", ensure.circleAdmin, function (req, res) {
    var circleId = req.params.circleId;
    var member = req.body;
    if (!member.groups) {
        res.status(400).send();
        return;
    }

    var groups = member.groups;
    db.users.updateGroups(member, circleId, groups, handle(res));
});

module.exports.router = router;