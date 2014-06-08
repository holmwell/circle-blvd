// This thing consumes a queue in a serial fashion. 
// An item in the queue is not consumed until the 
// item before it is consumed. 
//
// I'm sure there's a cool library for this, but
// it's pretty simple, so:
//
var process = require('process');
var queue = require('./queue-async.js');

module.exports = function () {
	var that = this;
	var isConsuming = false;
	var savedWorker = undefined;

	var consume = function (worker) {
		savedWorker = worker;
		isConsuming = true;
		var consumeNext = function () {
			// be cool, prevent stack overflows
			process.nextTick(function () {
				consume(worker);
			});
		};

		var doWorkAndContinue = function (err, thing) {
			worker(err, thing, function () {
				consumeNext();
			});
		};

		var consumerLoop = function () {
			queue.dequeue(function (err, thing) {
				if (err) {
					doWorkAndContinue(err, thing);
					return;
				}

				if (typeof thing === 'undefined') {
					// the queue is empty. we're done.
					isConsuming = false;
					return;
				}

				doWorkAndContinue(err, thing);
			});
		};
		
		consumerLoop();
	};


	var enqueue = function (thing, callback) {
		queue.enqueue(thing, function (err, thing) {
			callback(err, thing);
			// TODO: We could probably clean up this api,
			// though not sure what would be more intuitive.
			// 
			// Like, we want to communicate that adding to
			// a consumer that has started consuming will
			// immediately consume things.
			process.nextTick(function () {
				if (!isConsuming && savedWorker) {
					consume(savedWorker);
				}
			});
		});
	};


	return {
		consume: that.consume,
		enqueue: that.enqueue
	}
}();