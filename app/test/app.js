var async = require('async');
var nano = require('nano')('http://localhost:5984');
var request = require('supertest');

var databaseName = 'a-tmp-db-for-circle-blvd-testing';
var sessionsDatabaseName = databaseName + '-sessions';
process.env.DATABASE_NAME = databaseName;

var unit = undefined;
var test = {};

test.setUp = function (done) {
	var app = require('../app.js');
	unit = app.express;
	// CouchDB is not entirely ready when ready is
	// called. So, work around that until we can
	// fix it.
	var halfSecond = 500;
	app.whenReady(function () {
		setTimeout(function () {
			done();
		}, halfSecond);	
	});
};

test.tearDown = function (done) {
	var destroyTestDatabase = function (callback) {
		nano.db.destroy(databaseName, callback);
	};
	var destroyTestSessionsDb = function (callback) {
		nano.db.destroy(sessionsDatabaseName, callback);
	};

	var destroy = [destroyTestDatabase, destroyTestSessionsDb];
	async.series(destroy, function (err, results) {
		done();
	});
};

test['first call does a redirect'] = function (test) {
	request(unit)
	.get('/')
	.expect(function (res) {
		test.equal(res.statusCode, 302);
	})
	.end(test.done);
};

exports[''] = test;

