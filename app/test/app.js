var async = require('async');
var nano = require('nano')('http://localhost:5984');
var request = require('supertest');

var databaseName = 'a-tmp-db-for-circle-blvd-testing';
var sessionsDatabaseName = databaseName + '-sessions';
process.env.DATABASE_NAME = databaseName;

var unit = undefined;
var test = {};

test['database setup'] = function (test) {
	var app = require('../app.js');
	unit = app.express;
	// CouchDB is not entirely ready when ready is
	// called. So, work around that until we can
	// fix it.
	var halfSecond = 500;
	app.whenReady(function () {
		setTimeout(function () {
			test.done();
		}, halfSecond);	
	});
};

test['first call does a redirect'] = function (test) {
	request(unit)
	.get('/')
	.expect(302)
	.end(function (err) {
		test.ifError(err);
		test.done();
	});
};

test['/data/initialize succeeds'] = function (test) {
	var data = {};
	data.admin = {
		email: 'test@ok.com',
		password: 'Well, what do you think?'
	};

	request(unit)
	.put('/data/initialize')
	.send(data)
	.expect(200)
	.end(function (err) {
		test.ifError(err);
		test.done();
	});
};

test['database tear down'] = function (test) {
	var destroyTestDatabase = function (callback) {
		nano.db.destroy(databaseName, callback);
	};
	var destroyTestSessionsDb = function (callback) {
		nano.db.destroy(sessionsDatabaseName, callback);
	};

	var destroy = [destroyTestDatabase, destroyTestSessionsDb];
	async.series(destroy, function (err, results) {
		test.done();
	});
};

exports[''] = test;

