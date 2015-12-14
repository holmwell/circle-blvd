var express = require('express');
var router = express.Router();
var version = require('../../lib/version');

var app;

router.get("/", function (req, res, next) {
    var analyticsId = false;
    var settings = app.get('settings');
    if (settings && settings['google-analytics']) {
        analyticsId = settings['google-analytics'].value;
    }

    var params = {
        host: req.get('Host'),
        version: version,
        analyticsId: analyticsId
    };

    res.render('archives', params);
});

module.exports = function () {
    return {
        router: function (a) {
            app = a;
            return router;
        }
    }
}(); // closure