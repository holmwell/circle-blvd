var express = require('express');
var router = express.Router();
var version = require('circle-blvd/version');

router.get("/", function (req, res, next) {
    var analyticsId = false;
    var settings = req.app.get('settings');
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

module.exports.router = router; 