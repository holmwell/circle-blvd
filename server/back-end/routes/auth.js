var express = require('express');
var router = express.Router();

var authLib = require('circle-blvd/auth');
var errors = require('circle-blvd/errors');
var notify = require('circle-blvd/notify');

var guard = errors.guard;


// Requires an auth object like the one in circle-blvd/auth-local
var init = function (auth, secretSessionMaker, members) {
    router.post('/signin', auth.signin);
    router.get('/signout', auth.signout);

    router.get('/forgot/:docId/:secret', function (req, res) {
        var docId = req.params.docId;
        var secret = req.params.secret;

        if (!docId || !secret) {
            console.log('auth: no params')
            return res.status(404).send();
        }

        secretSessionMaker.find(docId, guard(res, function (session) {
            var sorryMessage = "Sorry, we don't know what you're looking for.";
            if (!session) {
                console.log("auth: session not found")
                return res.status(404).send(sorryMessage);
            }
            if (session.secret !== secret) {
                console.log("auth: secrets not equal")
                return res.status(404).send(sorryMessage);
            }
            members.findById(session.user, guard(res, function (member) {
                authLib.forceSignin(member, req, guard(res, function () {
                    res.status(200).send();
                }));
            }));
        }));
    });

    router.post('/signin/forgot', function (req, res) {
        var emailAddress = req.body.email;
        if (!emailAddress) {
            var err = new Error("email param not specified");
            err.status = 400;
            errors.handle(err, res);
            return;
        }

        // 0. If email address is valid ...
        members.findByEmail(emailAddress, guard(res, function (member) {
            if (!member) {
                // We're fine!
                return res.status(204).send();
            }

            //  1. Create something in session database ...
            secretSessionMaker.create(member, guard(res, function (session) {
                var params = {
                    session: session,
                    user: member
                };

                //  2. Email link to requestor ...
                notify.forgotPassword(params, req, guard(res, function () {
                    res.status(204).send();
                }));
            }));
        }));
    });
};

module.exports = function () {
    return {
        router: function (auth, secretSessionMaker, members) {
            init(auth, secretSessionMaker, members);
            return router;
        }
    }
}(); // closure