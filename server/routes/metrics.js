var express = require('express');
var router = express.Router();

var db = require('../lib/dataAccess.js').instance();
var errors = require('../lib/errors.js');
var ensure = require('../lib/auth-ensure.js');

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

module.exports = function () {
    return {
        router: function (a) {
            app = a;
            return router;
        }
    }
}(); // closure