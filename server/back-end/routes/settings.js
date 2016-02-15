// Routes for settings

var express = require('express');
var router = express.Router();

var db       = require('circle-blvd/dataAccess').instance();
var settings = require('circle-blvd/settings');
var ensure   = require('circle-blvd/auth-ensure');

var send   = require('circle-blvd/send');
var errors = require('circle-blvd/errors');

// caching middleware
var cache = function (ms) {
    var fn = function (req, res, next) {
        res.setHeader("Cache-Control", "max-age=" + ms);
        next();
    };
    return fn;
};

// TODO: Is this really six minutes?
var sixMinutes = 5 * 60;

// Get public settings
router.get("/", cache(sixMinutes), send(db.settings.get)); 

// Get settings that can be edited by mainframe admins
router.get("/authorized", ensure.mainframe, send(db.settings.getAuthorized));

// Save a setting
router.put("/setting", ensure.mainframe, function (req, res) {
    var data = req.body;

    var onSettingsUpdate = function (setting) {
        settings.handleUpdate(setting);
        res.status(200).send();
    };

    settings.update(data, errors.guard(res, onSettingsUpdate));
});

// TODO: This is not used. Assess.
router.get("/private", ensure.mainframe, send(db.settings.getPrivate)); 

module.exports.router = router;