var express = require('express');
var router = express.Router();

// TODO: Refactor this package version stuff with
// the duplicate code in index.js
var fs = require('fs');
var path = require('path');
var version = "0.0.0";

var packagePath = path.join(__dirname, "..", "package.json");
fs.readFile(packagePath, "utf-8", readPackageJson);

function readPackageJson(err, data) {
    if (err) {
        console.log("index: Could not read package.json at: " + packagePath);
        return;
    }
    var packageJson = JSON.parse(data);
    version = packageJson.version;
}

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