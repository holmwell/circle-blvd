// test/encrypt.js

var unit = require('../lib/encrypt.js');
var test = {};

test['salt is unique (100 times)'] = function (test) {
	var salts = {};
	var salt = undefined;

	for (var i=0; i < 100; i++) {
		salt = unit.salt();

		test.ok(!salts[salt], "salt is not unique");
		salts[salt] = 'I exist.';
	}

	test.done();
};

test['hash is deterministic (100 times)'] = function (test) {
	var salt = unit.salt();
	var password = "How am I not myself?";

	var hash1 = unit.hash(password, salt);
	var hash2 = undefined;
	for (var i=0; i < 100; i++) {
		hash2 = unit.hash(password, salt);
		test.equal(hash1, hash2, "hash is not deterministic")
	}

	test.done();
};

test['hash is not equal to password'] = function (test) {
	var salt = unit.salt();
	var password = "New England clam chowder";
	var hash = unit.hash(password, salt);
	test.notEqual(password, hash);
	test.done();
};

exports[''] = test;