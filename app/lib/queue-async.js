// A queue with an asyncronous api, so
// when we use CouchDB for storage, it 
// will be fine.
module.exports = function () {

	var things = [];

	var enqueueThing = function (thing, callback) {
		things.push(thing);
		if (callback) {
			callback();
		}
	};

	// callback(err, thing)
	var dequeueThing = function (callback) {
		if (things.length <= 0) {
			return callback();
		}

		var thing = things.shift();
		callback(null, thing);
	};

	return {
		enqueue: enqueueThing,
		dequeue: dequeueThing
	}
}(); // closure