// static-files.js
//
// Express router for serving static files 
//
var express = require('express');
var path = require('path');

var serveStatic   = require('serve-static');
var compactModule = require('compact-exclsr');
var jsManifest    = require('./js-client-manifest.js');

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

    var namespaceList = [];

    // Process manifest
    // 
    // Shorthand for: 
    // compact.addNamespace('lib')
    //     .addJs('lib/angular/angular.js')
    //     .addJs('lib/angular/angular-route.js')
    //
    for (var namespace in jsManifest) {
        var currentNamespace = compact.addNamespace(namespace);
        for (var index in jsManifest[namespace]) {
            currentNamespace.addJs(jsManifest[namespace][index]);
        }
        namespaceList.push(namespace);
    }

    // Rudimentary cache handling (changes the file name)
    var version = Date.now().toString();
    compact.addNamespace(version);
    namespaceList.push(version);

    router.use(serveStatic(staticPath));
    router.use(compact.middleware(namespaceList));

    return router;
};