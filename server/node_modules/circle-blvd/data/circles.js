var couch = require('./couch/couch.js');
couch.circles = require('./couch/circles.js');

module.exports = function () {

	var addCircle = function (circle, callback) {
		var newCircle = {
			name: circle.name,
			createdBy: circle.createdBy,
			colors: {},
			isAnonymous: true
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

	var countCreatedByUser = function (user, callback) {
		couch.circles.findByUser(user, function (err, rawCircles) {
			if (err) {
				return callback(err);
			}

			// TODO: Need to remove dups from the view
			var circles = {};
			rawCircles = rawCircles || [];
			rawCircles.forEach(function (circle) {
				circles[circle._id] = circle;
			});

			var circlesCreatedCount = 0;
			for (var key in circles) {
				var circle = circles[key];
				if (circle.createdBy
				&& circle.createdBy.id === user._id
				&& !circle.isArchived) {
					circlesCreatedCount++;
				}
			}

			callback(null, circlesCreatedCount);
		});
	};

	var updateCircle = function (circle, callback) {
		couch.circles.update(circle, callback);
	};

	var count = function countCircles (callback) {
		couch.circles.count(callback);
	};
	
	return {
		add: addCircle,
		count: count,
		get: couch.circles.get,
		getAll: function (callback) {
			couch.circles.getAll(callback);
		},
		findByUser: function (user, callback) {
			couch.circles.findByUser(user, callback);
		},
		countByUser: countCreatedByUser,
		update: updateCircle
	};
}(); // closure
