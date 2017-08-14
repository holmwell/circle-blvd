// static-files.js
//
// Express router for serving static files 
//
var express = require('express');
var path = require('path');

var webpack       = require('webpack');
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

    // Bundle everything with webpack
    router.use(function (req, res, next) {
        var outputPath = '/_dist';
        var appEntry = "../front-end/entry.js";

        var config = {
            entry: path.join(__dirname, appEntry),
            output: {
                path: path.join(staticPath, outputPath)
            },
            module: {
                rules: [{
                    test: /\.vue$/,
                    loader: 'vue-loader',
                    options: {
                      loaders: {
                        // Since sass-loader (weirdly) has SCSS as its default parse mode, we map
                        // the "scss" and "sass" values for the lang attribute to the right configs here.
                        // other preprocessors should work out of the box, no loader config like this necessary.
                        'scss': 'vue-style-loader!css-loader!sass-loader',
                        'sass': 'vue-style-loader!css-loader!sass-loader?indentedSyntax'
                      }
                      // other vue-loader options go here
                    }
                },
                {
                    test: /\.(png|jpg|gif|svg)$/,
                    loader: 'file-loader',
                    options: {
                      name: '[name].[ext]?[hash]'
                    }
                }]
            }
        };

        webpack(config, (err, stats) => {
            if (stats.hasErrors()) {
                console.log(stats);
                next(stats);
                return;
            }
            next(err);
        });
    });

    router.use(serveStatic(staticPath));
    router.use(compact.middleware(namespaceList));

    return router;
};