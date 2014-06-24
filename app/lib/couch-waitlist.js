var couch = require('./couch.js');
var database = couch.db;

module.exports = function () {

	var addRequest = function (request, callback) {
		var doc = {
			circle: request.circle,
			email: request.email,
			things: request.things,
			type: "waitlist",
			timestamp: Date.now()
		};

		database.insert(doc, callback);
	};

	var getWaitlist = function () {
		couch.view("admin/waitlist", callback);
	};

	return {
		add: addRequest,
		get: getWaitlist
	};
}();