var express = require('express');
var router = express.Router();

var errors = require('@holmwell/errors');
var ensure = require('circle-blvd/auth-ensure');

module.exports = function (db) {
    router.get("/members/count", ensure.mainframe, function (req, res) {
    	db.users.count(errors.guard(res, function (count) {
    		res.status(200).send(count.toString());
    	}));
    });

    router.get("/members/admins/count", ensure.mainframe, function (req, res) {
    	db.users.adminCount(errors.guard(res, function (count) {
    		res.status(200).send(count.toString());
    	}));
    });

    router.get("/circles/stats", ensure.mainframe, function (req, res) {
        db.archives.allStats(errors.guard(res, function (stats) {
            res.status(200).send(stats);
        }));
    });

    return {
        router: router
    };
};