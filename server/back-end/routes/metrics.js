var express = require('express');
var router = express.Router();

var db = require('circle-blvd/dataAccess').instance();
var errors = require('circle-blvd/errors');
var ensure = require('circle-blvd/auth-ensure');

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

module.exports.router = router;