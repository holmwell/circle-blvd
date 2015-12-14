// test/auth-ensure.js

var unit = require('circle-blvd/auth-ensure');
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

var expectPass = function (server, test, query) {
	request(server)
	.get(query ? query : '/')
	.expect(200)
	.end(function (err) {
		test.done(err);
	});
};

var expectFail = function (server, test, query) {
	var notOk = function (res) {
		return res.statusCode === 200;
	};

	request(server)
	.get(query ? query : '/')
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
	var addMembership = function (req, res, next) {
		req.user.memberships.push({
			circle: "yes"
		});
		next();
	};

	var server = mocks.empty();
	server.use(isAuthenticated);
	server.use(addMembership);

	// Because Express 4 resets the params, we have to do
	// something like this to get a valid req.params into
	// unit.circle.
	server.get('/:circleId', unit.circle, function (req, res, next) {
		next();
	});

	server.use(function (req, res, next) {
		res.sendStatus(200);
	});

	expectFail(server, test, '/nope');
};

test.circle['is in circle'] = function (test) {
	var circleId = "yes";

	var addMembership = function (req, res, next) {
		req.user.memberships.push({
			circle: circleId
		});
		next();
	};

	var server = mocks.empty();
	server.use(isAuthenticated);
	server.use(addMembership);

	// Because Express 4 resets the params, we have to do
	// something like this to get a valid req.params into
	// unit.circle.
	server.get('/:circleId', unit.circle, function (req, res, next) {
		next();
	});

	server.use(function (req, res, next) {
		res.sendStatus(200);
	});

	expectPass(server, test, '/' + circleId);
};

test.circle['is in circle, not admin'] = function (test) {
	var isCircleNotAdmin = function (req, res, next) {
		req.user.memberships.push({
			circle: "yes",
			name: "nope"
		});
		next();
	};

	var server = mocks.empty();
	server.use(isAuthenticated);
	server.use(isCircleNotAdmin);

	// Because Express 4 resets the params, we have to do
	// something like this to get a valid req.params into
	// unit.circleAdmin.
	server.get('/:circleId', unit.circleAdmin, function (req, res, next) {
		next();
	});

	server.use(function (req, res, next) {
		res.sendStatus(200);
	});

	expectFail(server, test, "/yes");
};

test.circle['is in circle, is admin'] = function (test) {

	var circleId = "yes";
	var isCircleAdmin = function (req, res, next) {
		req.user.memberships.push({
			circle: circleId,
			name: "Administrative"
		});
		next();
	};

	var server = mocks.empty();
	server.use(isAuthenticated);
	server.use(isCircleAdmin);

	// Because Express 4 resets the params, we have to do
	// something like this to get a valid req.params into
	// unit.circleAdmin.
	server.get('/:circleId', unit.circleAdmin, function (req, res, next) {
		next();
	});

	server.use(function (req, res, next) {
		res.sendStatus(200);
	});

	expectPass(server, test, '/' + circleId);
};

test.circle['is admin, not in circle'] = function (test) {
	var isAdminNotCircle = function (req, res, next) {
		req.user.memberships.push({
			circle: "nope",
			name: "Administrative"
		});
		next();
	};

	var server = mocks.empty();
	server.use(isAuthenticated);
	server.use(isAdminNotCircle);

	// Because Express 4 resets the params, we have to do
	// something like this to get a valid req.params into
	// unit.circleAdmin.
	server.get('/:circleId', unit.circleAdmin, function (req, res, next) {
		next();
	});

	server.use(function (req, res, next) {
		res.sendStatus(200);
	});

	expectFail(server, test, '/yes');
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