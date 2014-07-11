// test/auth-ensure.js

var unit = require('../lib/auth-ensure.js');

var express = require('express');
var request = require('supertest');


exports.auth = {};
exports.dependencies = function (test) {
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

exports.auth.testIsAuthenticated = function (test) {
	var server = createServer(isAuthenticated, unit.auth);
	request(server)
	.get('/')
	.expect(200, test.done);
};

exports.auth.testIsNotAuthenticated = function (test) {
	var server = createServer(isNotAuthenticated, unit.auth);

	var notOk = function (res) {
		return res.statusCode === 200;
	};

	request(server)
	.get('/')
	.expect(notOk)
	.end(test.done);
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

	// Accept multiple params of middleware as our args
	for (var index in arguments) {
		app.use(arguments[index]);
	}

	app.use(function (req, res) {
		res.send(200);
	});
	return app;
};