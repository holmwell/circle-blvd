// TODO: This code combines front-end (render) and back-end
// functionality, and should be edited to split them apart.

var express = require('express');
var router = express.Router();
var version = require('../lib/version');

var secretSessionMaker = require('../lib/secret-session-maker.js');
var authLib = require('../lib/auth.js');
var errors = require('../lib/errors.js');
var notify = require('../lib/notify.js');
var members = require('../lib/data/users.js');

var guard = errors.guard;


// Requires an auth object like the one in ../lib/auth-local.js
var init = function (auth, app) {
    router.post('/signin', auth.signin);
    router.get('/signout', auth.signout);

    router.get('/forgot/:docId/:secret', function (req, res) {
        var docId = req.params.docId;
        var secret = req.params.secret;

        if (!docId || !secret) {
            console.log('auth: no params')
            return res.status(404).send();
        }

        // TODO: Consolidate with the code in prelude.js routes
        var getDefaultParams = function (req) {
            var analyticsId = false;
            var settings = app.get('settings');
            if (settings && settings['google-analytics']) {
                analyticsId = settings['google-analytics'].value;
            }

            var params = {
                host: req.get('Host'),
                version: version,
                analyticsId: analyticsId,
                angularModuleName: 'cbPrelude'
            };

            return params;
        };

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
                    // TODO: This should be split out to a different place,
                    // so we can put the front end and back end on different
                    // servers.
                    res.render('auth/forgot', getDefaultParams(req));
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
        router: function (auth, app) {
            init(auth, app);
            return router;
        }
    }
}(); // closure