// auth-local.js

// This unit test is mostly an example of how to mock
// something using rewire, rather than an actual useful
// test. There's not much in auth-local.js itself
// to actually test.

// TODO: This no longer works, with our move
// to passing in a database instance into auth-local.

// var rewire  = require('rewire');
// var mocks   = require('./lib/mocks.js');
// var request = require('supertest');

// var unit   = rewire('circle-blvd/auth-local');
var test   = {};

// var dbMock = function () {
// 	var doNothing = function (user, callback) {
// 		callback();
// 	};
// 	return {
// 		users: {
// 			recordSigninSuccess: doNothing,
// 			recordSigninFailure: doNothing
// 		}
// 	}
// }();

// var alwaysPass = function () {
// 	var fred = {
// 	   "name": "Fred",
// 	   "type": "user"
// 	};

// 	var alwaysFred = function (req, success, failure) {
// 		var fn = function (req, res, next) {
// 			// Mocks passport.authenticate
// 			req.user = fred; 
// 			success();
// 		};

// 		return fn;
// 	};
// 	return {
// 		local: alwaysFred
// 	};
// }();

// var alwaysFail = function () {
// 	return {
// 		local: function (req, success, failure) {
// 			var fn = function (req, res, next) {
// 				var error = new Error("Signin attempt failed");
// 				failure(error);
// 			};
// 			return fn;
// 		}
// 	};
// }();


// var init = function () {
// 	unit.__set__("db", dbMock);
// 	unit.__set__("auth", alwaysPass);
// 	unit.__set__("errors", mocks.errors);	
// }(); // closure


// test['signin responds with user obj'] = function (test) {
// 	var server = mocks.server(unit.signin);
// 	request(server)
// 	.post('/')
// 	.expect(function (res) {
// 		test.equal(res.body.name, "Fred", "User is not returned");
// 	})
// 	.end(test.done);
// };

// test['signin can respond with 401'] = function (test) {
// 	unit.__set__("auth", alwaysFail);
// 	var server = mocks.server(unit.signin);
// 	var data = {};
// 	request(server)
// 	.post('/', data)
// 	.expect(401)
// 	.end(test.done);
// };

// This doesn't work on the Mac for some reason,
// but it's a silly test, and it's covered by
// the app.js tests anyway.
//
// test['signout responds'] = function (test) {
// 	var server = mocks.server(unit.signout);
// 	request(server)
// 	.get('/')
// 	.expect(204)
// 	.end(test.done);
// };

exports[''] = test;