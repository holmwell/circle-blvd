// queue-consumer.js
var async = require('async');
var test = {};

var unit;
var itemCount = 9;
var n = [];

// TODO: This is the same init as in queue-async.js
// Perhaps we should refactor? Maybe.
var init = function () {
	for (var i=0; i < itemCount; i++) {
		n.push(i)
	}	
}(); // closure

test.setUp = function (done) {
	unit = require('circle-blvd/queue-consumer');
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

test['queue is consumed in order'] = function (test) {
	var shouldBe = 0;
	var worker = function (err, thing, next) {
		test.equal(thing, shouldBe, "queue consumed out of order");
		shouldBe++;
		next();

		if (thing === n[itemCount-1]) {
			test.done();
		}
	};
	unit.consume(worker);
};

test['items added to an empty, active queue are consumed'] = function (test) {
	var worker = function (err, thing, next) {
		next();
		if (thing === n[itemCount-1]) {
			queueIsDone();
		}
		if (thing === "after") {
			test.done();
		}
	};
	unit.consume(worker);

	var queueIsDone = function () {
		unit.enqueue("after");
	};
};

exports[''] = test;