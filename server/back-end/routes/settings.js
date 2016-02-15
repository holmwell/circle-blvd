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
var sixMinutes = 5 * 60;

router.get("/", cache(sixMinutes), send(db.settings.get)); // public
router.get("/authorized", ensure.mainframe, send(db.settings.getAuthorized));

// TODO: This is not used. Assess.
router.get("/private", ensure.mainframe, send(db.settings.getPrivate)); 

// TODO: This function has a lot of dependencies. 
// Clean up this mess, so we can get it out of this
// file.
router.put("/setting", ensure.mainframe, function (req, res) {
    var data = req.body;

    var onSettingsUpdate = function (setting) {
        settings.handleUpdate(setting);
        res.status(200).send();
    };

    db.settings.update(data, errors.guard(res, onSettingsUpdate));
});


module.exports.router = router;