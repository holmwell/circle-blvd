var couch = require('./couch.js');
couch.circles = require('./couch-circles.js');

module.exports = function () {

	var addCircle = function (circle, callback) {
		var newCircle = {
			name: circle.name
		};

		couch.circles.add(newCircle, function (err, body) {
			if (err) {
				return callback(err);
			}

			newCircle._id = body.id;
			newCircle._rev = body.rev;
			callback(null, newCircle);
		});
	};

	var updateCircle = function (circle, callback) {
		couch.circles.update(circle, callback);
	};

	return {
		add: addCircle,
		getAll: function (callback) {
			couch.circles.getAll(callback);
		},
		findByUser: function (user, callback) {
			couch.circles.findByUser(user, callback);
		},
		update: updateCircle
	};
}(); // closure
