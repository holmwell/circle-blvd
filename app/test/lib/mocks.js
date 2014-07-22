// mocks.js
var express = require('express');

var createServer = function(middleware) {
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

module.exports = function () {
	return {
		server: createServer
	}
}();