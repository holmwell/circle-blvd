// webpack.js
//
// Thrown-together webpack setup
//
var express = require('express');
var path    = require('path');
var fs      = require('fs');
var util    = require('util')

var webpack    = require('webpack');
var jsManifest = require('./js-client-manifest.js');

var minJsPath = '/_js';

module.exports = function (staticPath, isDebugging) {
    // TODO: 
    // var router = express.Router();

    var build = function (callback) {
        var outputPath = '/_dist';
        // All of our Vue stuff is in the story list
        var appEntry = "../front-end/public/ui/directives/spSortableListWrapper.js";

        var fullOutputPath = path.join(staticPath, outputPath);
        if (fs.existsSync(fullOutputPath) && !isDebugging) {
            // return next();
        }

        var module = {
            rules: [{
                test: /\.vue$/,
                loader: 'vue-loader',
                options: {
                  loaders: {
                    // Since sass-loader (weirdly) has SCSS as its default parse mode, we map
                    // the "scss" and "sass" values for the lang attribute to the right configs here.
                    // other preprocessors should work out of the box, no loader config like this necessary.
                    'scss': 'vue-style-loader!css-loader!sass-loader',
                    'sass': 'vue-style-loader!css-loader!sass-loader?indentedSyntax',
                    js: 'babel-loader'
                  }
                  // other vue-loader options go here
                }
            },
            {
                test: /\.(png|jpg|gif)$/,
                loader: 'file-loader',
                options: {
                  name: '[name].[ext]?[hash]'
                }
            },
            {
                test: /\.svg$/,
                loader: 'svg-inline-loader'
            }]
        };

        var resolveLoader = {
            modules: [path.resolve(__dirname, '../node_modules')]
        };

        var config = [{
            stats: "errors-only",
            entry: path.join(__dirname, '../front-end/entry.js'),
            output: {
                path: path.join(staticPath, outputPath),
                filename: 'circle.js'
            },
            module: module,
            resolveLoader: resolveLoader
        },{
            entry: path.join(__dirname, appEntry),
            context: path.resolve(__dirname, "../front-end"),
            output: {
                path: path.join(staticPath, outputPath)
            },
            module: module,
            resolveLoader: resolveLoader
        }
        ];

        if (!isDebugging) {
            for (var index in config) {
                config[index].plugins = [
                    // short-circuits all Vue.js warning code
                    new webpack.DefinePlugin({
                      'process.env': {
                        NODE_ENV: '"production"'
                      }
                    })//,
                    // minify with dead-code elimination
                    // new webpack.optimize.UglifyJsPlugin({
                    //   compress: {
                    //     warnings: false
                    //   }
                    // })
                ]
            }
        }

        callback = callback || function () {};
        webpack(config, (err, stats) => {
            if (err) {
                console.log(err);
            }

            if (stats.hasErrors()) {
                console.log(util.inspect(stats, false, 4));
                return callback(stats);
            }
            return callback(err);
        });
    }

    return {
        build: build
    };
};