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
var config     = require('./webpack.config.js');

var minJsPath = '/_js';

module.exports = function (staticPath, isDebugging) {
    // TODO: 
    // var router = express.Router();

    var build = function (callback) {
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