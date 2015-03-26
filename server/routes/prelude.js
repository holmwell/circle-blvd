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

var getDefaultParams = function (req) {
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

    return params;
};

router.get("/signin", function (req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/');
    }
    else {
        res.render('signin', getDefaultParams(req));
    }
});

router.get("/about", function (req, res, next) {
    res.render('about', getDefaultParams(req));
});

router.get('/tour', function (req, res, next) {
    res.render('tour', getDefaultParams(req));
});

router.get('/tour/work', function (req, res, next) {
    res.render('tour-work', getDefaultParams(req));
});

router.get('/tour/work/*', function (req, res, next) {
    res.render('tour-work', getDefaultParams(req));
});

router.get('/tour/plan', function (req, res, next) {
    res.render('tour-plan', getDefaultParams(req));
});

router.get('/tour/plan/*', function (req, res, next) {
    res.render('tour-plan', getDefaultParams(req));
});

router.get("/privacy", function (req, res, next) {
    res.render('privacy', getDefaultParams(req));
});

router.get("/sponsor", function (req, res, next) {
    res.render('sponsor', getDefaultParams(req));
});

router.get("/donate", function (req, res, next) {
    res.render('donate', getDefaultParams(req));
});

// router.get("/contact", function (req, res, next) {
//     // TODO: Redirect to signin
//     res.render('contact', getDefaultParams(req));
// });

router.get('/', function (req, res, next) {
    if (!req.isAuthenticated()) {
        res.render('signin', getDefaultParams(req));
    }
    else {
        next();
    }
});

module.exports = function () {
    return {
        router: function (a) {
            app = a;
            return router;
        }
    }
}(); // closure