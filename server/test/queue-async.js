// queue-async.js
var async = require('async');
var test = {};
var unit;

var itemCount = 9;
var n = [];

var init = function () {
	for (var i=0; i < itemCount; i++) {
		n.push(i)
	}	
}(); // closure

test.setUp = function (done) {
	unit = require('circle-blvd/queue-async');
	// build a queue with a size of 'itemCount'
	// that is like this [1, 2, ..., itemCount]
	var enqueueCount = 0;
	var enqueue = function (callback) {
		enqueueCount++;
		unit.enqueue(n[enqueueCount-1], callback);
	}

	var enqueueFunctions = [];
	for (var i=0; i < itemCount; i++) {
		enqueueFunctions.push(enqueue);
	}

	async.series(enqueueFunctions);
	done();
};

test.tearDown = function (done) {
	unit = undefined;
	done();
};

test['first in, first out'] = function (test) {
	var dequeueFunctions = [];
	for (var i=0; i < itemCount; i++) {
		dequeueFunctions.push(unit.dequeue);
	}

	async.series(dequeueFunctions, function (err, results) {
		for (var i=0; i < itemCount; i++) {
			test.equal(results[i], n[i], "Item " + i + " in queue not correct");
		}
	});

	test.done();
};

test['when empty, returns undefined'] = function (test) {
	var clearQueue = function () {
		var dequeueFunctions = [];
		for (var i=0; i < itemCount; i++) {
			dequeueFunctions.push(unit.dequeue);
		}
		async.series(dequeueFunctions);		
	}(); // closure

	unit.dequeue(function (err, empty) {
		test.equal(empty, undefined, "Queue is not empty")
	});

	test.done();
};

exports[''] = test;