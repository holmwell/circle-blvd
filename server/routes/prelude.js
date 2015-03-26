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
        analyticsId: analyticsId,
        angularModuleName: 'cbPrelude'
    };

    return params;
};

var render = function (view) {
    return function (req, res, next) {
        res.render('prelude/' + view, getDefaultParams(req));
    };
};

router.get("/signin", function (req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/');
    }
    else {
        res.render('prelude/signin', getDefaultParams(req));
    }
});

router.get("/about", render('about'));

router.get('/tour', render('tour'));
router.get('/tour/work', render('tour-work'));
router.get('/tour/work/*', render('tour-work'));
router.get('/tour/plan', render('tour-plan'));
router.get('/tour/plan/*', render('tour-plan'));

router.get("/privacy", render('privacy'));
router.get("/sponsor", render('sponsor'));
router.get("/donate", render('donate'));

// router.get("/contact", function (req, res, next) {
//     // TODO: Redirect to signin
//     res.render('contact', getDefaultParams(req));
// });

router.get('/', function (req, res, next) {
    if (!req.isAuthenticated()) {
        res.render('prelude/signin', getDefaultParams(req));
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