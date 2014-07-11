// test/auth-ensure.js

var unit = require('../lib/auth-ensure.js');

var express = require('express');
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

test.auth.isAuthenticated = function (test) {
	var server = createServer(isAuthenticated, unit.auth);
	expectPass(server, test);
};

test.auth.isNotAuthenticated = function (test) {
	var server = createServer(isNotAuthenticated, unit.auth);
	expectFail(server, test);
};


test.mainframe.isMainframe = function (test) {
	var isMainframe = function (req, res, next) {
		req.user.memberships.push({
			name: "Mainframe"
		});
		next();
	}

	var server = createServer(isAuthenticated, 
		isMainframe, 
		unit.mainframe);

	expectPass(server, test);
};

test.mainframe.isNotMainframe = function (test) {
	var isNotMainframe = function (req, res, next) {
		req.user.memberships.push({
			name: "Not mainframe"
		});
		next();
	};
	var server = createServer(isAuthenticated, 
		isNotMainframe, 
		unit.mainframe);

	expectFail(server, test);
};


test.circle.circleMissing = function (test) {
	var server = createServer(isAuthenticated, unit.circle);
	expectFail(server, test);
};

test.circle.isNotCircle = function (test) {
	var isNotCircle = function (req, res, next) {
		req.params.circleId = "nope";
		req.user.memberships.push({
			circle: "yes"
		});
		next();
	};

	var server = createServer(isAuthenticated,
		isNotCircle,
		unit.circle);

	expectFail(server, test);
};

test.circle.isCircle = function (test) {
	var isCircle = function (req, res, next) {
		req.params.circleId = "yes";
		req.user.memberships.push({
			circle: "yes"
		});
		next();
	};

	var server = createServer(isAuthenticated,
		isCircle, unit.circle);

	expectPass(server, test);
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


function createServer (middleware) {
	var app = express();

	// Assume we have a user
	var user = function (req, res, next) {
		req.user = {};
		req.user.memberships = [];
		next();
	};
	app.use(user);

	// Basic request stuff
	var request = function (req, res, next) {
		req.params = {};
		next();
	};
	app.use(request);

	// Accept multiple params of middleware as our args
	for (var index in arguments) {
		app.use(arguments[index]);
	}

	app.use(function (req, res) {
		res.send(200);
	});
	return app;
};

exports['auth-ensure'] = test;