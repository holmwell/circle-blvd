// auth-local.js

// This unit test is mostly an example of how to mock
// something using rewire, rather than an actual useful
// test. There's not much in auth-local.js itself
// to actually test.

var rewire = require('rewire');
var unit   = rewire('../lib/auth-local.js');
var test   = {};

var dbMock = function () {
	var doNothing = function (user, callback) {
		callback();
	};
	return {
		users: {
			recordSigninSuccess: doNothing,
			recordSigninFailure: doNothing
		}
	}
}();

var authMock = function () {
	var fred = {
	   "name": "Fred",
	   "type": "user"
	};

	var alwaysFred = function (req, success, failure) {
		var fn = function (req, res, next) {
			req.user = fred;
			success();
		};

		return fn;
	};
	return {
		local: alwaysFred
	};
}();

unit.__set__("db", dbMock);
unit.__set__("auth", authMock);

test['signin responds'] = function (test) {
	var req = {};
	var res = {
		send: function (status, user) {
			test.equal(user.name, "Fred");
			test.equal(req.user.name, "Fred");
			test.done();
		}
	};
	var next = {};
	unit.signin(req, res, next);
};

exports[''] = test;