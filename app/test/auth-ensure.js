// test/auth-ensure.js

var unit = require('../lib/auth-ensure.js');
var mocks = require('./lib/mocks.js');
var request = require('supertest');

var test = {};
test.auth = {};
test.mainframe = {};
test.circle = {};

test.dependencies = function (test) {
	var middlewares = [
		'auth', 
		'mainframe',
		'isCircle',
		'circle',
		'circleAdmin'
	];
	middlewares.forEach(function (middleware) {
		test.ok(unit[middleware], middleware + ' middleware not defined.');
	});

	test.done();
};

var expectPass = function (server, test) {
	request(server)
	.get('/')
	.expect(200, test.done);
};

var expectFail = function (server, test) {
	var notOk = function (res) {
		return res.statusCode === 200;
	};

	request(server)
	.get('/')
	.expect(notOk)
	.end(test.done);
};

test.auth['is authenticated'] = function (test) {
	var server = mocks.server(isAuthenticated, unit.auth);
	expectPass(server, test);
};

test.auth['not authenticated'] = function (test) {
	var server = mocks.server(isNotAuthenticated, unit.auth);
	expectFail(server, test);
};


test.mainframe['has mainframe access'] = function (test) {
	var isMainframe = function (req, res, next) {
		req.user.memberships.push({
			name: "Mainframe"
		});
		next();
	}

	var server = mocks.server(isAuthenticated, 
		isMainframe, 
		unit.mainframe);

	expectPass(server, test);
};

test.mainframe['no mainframe access'] = function (test) {
	var isNotMainframe = function (req, res, next) {
		req.user.memberships.push({
			name: "Not mainframe"
		});
		next();
	};
	var server = mocks.server(isAuthenticated, 
		isNotMainframe, 
		unit.mainframe);

	expectFail(server, test);
};


test.circle['no circleId specified'] = function (test) {
	var server = mocks.server(isAuthenticated, unit.circle);
	expectFail(server, test);
};

test.circle['is not in circle'] = function (test) {
	var isNotCircle = function (req, res, next) {
		req.params.circleId = "nope";
		req.user.memberships.push({
			circle: "yes"
		});
		next();
	};

	var server = mocks.server(isAuthenticated,
		isNotCircle,
		unit.circle);

	expectFail(server, test);
};

test.circle['is in circle'] = function (test) {
	var isCircle = function (req, res, next) {
		req.params.circleId = "yes";
		req.user.memberships.push({
			circle: "yes"
		});
		next();
	};

	var server = mocks.server(isAuthenticated,
		isCircle, unit.circle);

	expectPass(server, test);
};

test.circle['is in circle, not admin'] = function (test) {
	var isCircleNotAdmin = function (req, res, next) {
		req.params.circleId = "yes";
		req.user.memberships.push({
			circle: "yes",
			name: "nope"
		});
		next();
	};

	var server = mocks.server(isAuthenticated,
		isCircleNotAdmin, unit.circleAdmin);

	expectFail(server, test);
};

test.circle['is in circle, is admin'] = function (test) {
	var isCircleAdmin = function (req, res, next) {
		req.params.circleId = "yes";
		req.user.memberships.push({
			circle: "yes",
			name: "Administrative"
		});
		next();
	};

	var server = mocks.server(isAuthenticated,
		isCircleAdmin, unit.circleAdmin);

	expectPass(server, test);
};

test.circle['is admin, not in circle'] = function (test) {
	var isAdminNotCircle = function (req, res, next) {
		req.params.circleId = "yes";
		req.user.memberships.push({
			circle: "nope",
			name: "Administrative"
		});
		next();
	};

	var server = mocks.server(isAuthenticated,
		isAdminNotCircle, unit.circleAdmin);

	expectFail(server, test);
};


var isAuthenticated = function (req, res, next) {
	req.isAuthenticated = function () {
		return true;
	};
	next();
};

var isNotAuthenticated = function (req, res, next) {
	req.isAuthenticated = function () {
		return false;
	};
	next();
};

exports[''] = test;