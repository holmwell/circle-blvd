// static.js
//
// Express router for serving static files 
//
var express = require('express');
var path = require('path');

var serveStatic   = require('serve-static');
var compactModule = require('compact-exclsr');
// var jsManifest    = require('./js-client-manifest.js');

var minJsPath = '/_js';

module.exports = function (staticPath, isDebugging) {
    var router = express.Router();

    // for minifying JavaScript
    var compact = compactModule.createCompact({
        srcPath: staticPath,
        destPath: path.join(staticPath, minJsPath),
        webPath: minJsPath,
        debug: isDebugging
    });

    compact.addNamespace('lib')
        .addJs('lib/angular/angular.js')
        .addJs('lib/angular/angular-route.js')
        .addJs('lib/angular/angular-sanitize.js')
        .addJs('lib/store/store.min.js')
        .addJs('lib/autosize/jquery.autosize.min.js')
        .addJs('lib/typeahead/0.10.2.js');

    compact.addNamespace('app')
        .addJs('main/app.js');

    compact.addNamespace('services')
        .addJs('services/analytics.js')
        .addJs('services/lib.js')
        .addJs('services/hacks.js')
        .addJs('services/signInName.js')
        .addJs('services/session.js')
        .addJs('services/stories.js')
        .addJs('services/errors.js')
        .addJs('main/services.js');

    compact.addNamespace('controllers')
        .addJs('ui/controllers/topLevel.js')
        .addJs('main/controllers.js')
        .addJs('ui/controllers/story.js')
        .addJs('ui/controllers/storyList.js')
        .addJs('ui/controllers/storySummary.js')
        .addJs('ui/controllers/roadmapMilepost.js')
        .addJs('ui/controllers/home.js')
        .addJs('ui/controllers/welcome.js')
        .addJs('ui/controllers/signin.js')
        .addJs('ui/controllers/forgot.js')
        .addJs('ui/controllers/archive.js')
        .addJs('ui/controllers/lists.js')
        .addJs('ui/controllers/listDetail.js')
        .addJs('ui/controllers/profile.js')
        .addJs('ui/controllers/invite.js')
        .addJs('ui/controllers/tour.js')
        .addJs('ui/controllers/contact.js')
        .addJs('ui/controllers/partner.js')
        .addJs('ui/controllers/about.js')
        .addJs('ui/controllers/privacy.js')
        .addJs('ui/controllers/donate.js')
        .addJs('ui/controllers/admin.js')
        .addJs('ui/controllers/createCircle.js')
        .addJs('ui/controllers/removeHash.js')
        .addJs('ui/controllers/mainframe.js')
        .addJs('ui/controllers/fix.js')

    compact.addNamespace('main')
        .addJs('main/filters.js')
        .addJs('main/directives.js')

    // Rudimentary cache handling
    var version = Date.now().toString();
    compact.addNamespace(version);

    router.use(serveStatic(staticPath));
    router.use(compact.middleware([
        'lib', 
        'app', 
        'services', 
        'controllers', 
        'main',
        version
    ]));

    return router;
};