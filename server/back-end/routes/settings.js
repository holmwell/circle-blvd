// Routes for settings

var express = require('express');
var router = express.Router();

var db = require('circle-blvd/dataAccess').instance();
var ensure = require('circle-blvd/auth-ensure');

var send = require('circle-blvd/send');

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

module.exports = function () {
    return {
        router: function (a) {
            app = a;
            return router;
        }
    }
}(); // closure