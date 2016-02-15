// Routes for signing up and invitations.

var express = require('express');
var router = express.Router();

var db = require('circle-blvd/dataAccess').instance();
var errors = require('circle-blvd/errors');
var ensure = require('circle-blvd/auth-ensure');

var guard = errors.guard;
var handle = require('circle-blvd/handle');
var limits = require('circle-blvd/limits');


var createUser = function (proposedAccount, callback) {
    var addSuccess = function (newAccount) {
        callback(null, newAccount);
    };

    var addError = function (err) {
        callback(err);
    };

    db.users.findByEmail(proposedAccount.email, guard(callback, function (accountExists) {
        if (accountExists) {
            var error = new Error("That email address is already being used. Maybe try signing in?");
            error.status = 400;
            return callback(error);
        }

        var isReadOnly = false;
        db.users.add(
            proposedAccount.name,
            proposedAccount.email, 
            proposedAccount.password,
            [], // no memberships at first
            isReadOnly,
            addSuccess, 
            addError);
    }));
};

var createAccount = function (proposedAccount, circle, callback) {
    var userAccountCreated = function (newAccount) {
        db.circles.createFirst(circle.name, newAccount.email, callback);
    };
    createUser(proposedAccount, guard(callback, userAccountCreated));
};

var acceptInvitation = function (res, invite, callback) {
    db.groups.findImpliedByCircleId(invite.circleId, guard(res, function (group) {
        if (!group) {
            res.status(400).send("Could not find implied group for invite.");
            return;
        }
        db.invites.get(invite._id, guard(res, function (dbInvite) {
            if (!dbInvite) {
                res.status(404).send();
                return;
            }
            if (dbInvite.count <= 0) {
                res.status(403).send();
                return;
            }
            db.invites.accept(dbInvite, guard(res, function () {
                callback(dbInvite, group);
            }));
        }));    
    }));
};

var addGroupToAccount = function (account, group, circleId, callback) {
    var newMembership = {
        circle: circleId,
        group: group.id,
        level: "member"
    };
    account.memberships.push(newMembership);
    db.users.addMembership(account, circleId, callback);
};

router.post("/invite", limits.users.total, function (req, res) {
    var data = req.body;
    var proposedAccount = data.account;
    var invite = data.invite;

    var inviteAccepted = function (dbInvite, group) {
        createUser(proposedAccount, guard(res, function (account) {
            addGroupToAccount(account, group, dbInvite.circleId, handle(res));
        }));
    };

    acceptInvitation(res, invite, inviteAccepted);
});


router.post("/invite/accept", function (req, res) {
    var data = req.body;
    var account = data.account;
    var invite = data.invite;
    account.memberships = [];

    var inviteAccepted = function(dbInvite, group) {
        addGroupToAccount(account, group, dbInvite.circleId, handle(res));
    };

    acceptInvitation(res, invite, inviteAccepted);
});


router.post("/now", limits.circle, limits.users.total, function (req, res) {
    var data = req.body;
    var proposedAccount = {
        name: data.name,
        email: data.email,
        password: data.password
    };
    var proposedCircle = {
        name: data.circle
    };
    createAccount(proposedAccount, proposedCircle, handle(res));
});

router.post("/waitlist", function (req, res) {
    var data = req.body;
    var request = {
        circle: data.circle,
        things: data.things,
        email: data.email
    };

    db.waitlist.add(request, handle(res));
});

module.exports.router = router;