var couch = require('./couch.js');
var database = couch.db;

module.exports = function () {

	var addCircle = function (circle, callback) {
		circle.type = "circle";
		database.insert(circle, callback);
	};

	var getAllCircles = function (callback) {
		couch.view("circles/byName", callback);
	};

	var findCirclesByUser = function (user, callback) {
		var circleIds = [];

		for (var membershipKey in user.memberships) {
			var membership = user.memberships[membershipKey];
			circleIds.push(membership.circle);
		}

		couch.fetch(circleIds, callback);
	};


	var updateCircle = function (circle, callback) {
		var copyCircle = function (source, dest) {
			dest.name = source.name;
		};

		database.get(circle._id, function (err, circleToUpdate) {
			if (err) {
				return callback(err);
			}
			if (circleToUpdate.type !== "circle") {
				return callback({
					message: "Update circle: Attempt to update a non-circle."
				});
			}

			copyCircle(circle, circleToUpdate);
			database.insert(circleToUpdate, function (err, body) {
				if (err) {
					return callback(err);
				}
				circleToUpdate._rev = body.rev;
				return callback(null, circleToUpdate);
			});
		});
	};


	return {
		add: addCircle,
		getAll: getAllCircles,
		findByUser: findCirclesByUser,
		update: updateCircle
	};
}();