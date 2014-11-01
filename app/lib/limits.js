// limits.js
var async = require('async');
var db = require('./dataAccess.js').instance();
var errors = require('./errors.js');
var guard = errors.guard;

module.exports = function () {

	var checkCircleLimit = function (req, res, next) {
		checkLimit(next);

		function checkLimit (callback) {
			db.settings.getAll(guard(res, function (settings) {
				checkSettings(settings, callback);
			}));
		}

		function checkSettings(settings, callback) {
			if (!settings['limit-circles']) {
				// No limit!
				return callback(); 
			}

			var limit = settings['limit-circles'].value;
			db.circles.count(guard(res, function (count) {
				if (count >= limit) {
					res.send(403, "Sorry, our computers have reached their circle creation limit," +
						" and no more can be made, by anyone, at this time.");
					return;
				}
				return callback();
			}));
		}
	};

	var checkMemberLimit = function (req, res, next) {
		checkLimit(next);

		function checkLimit (callback) {
			db.settings.getAll(guard(res, function (settings) {
				checkSettings(settings, callback);
			}));
		}

		function checkSettings(settings, callback) {
			if (!settings['limit-total-members']) {
				// No limit!
				return callback(); 
			}

			var limit = settings['limit-total-members'].value;
			db.users.count(guard(res, function (count) {
				if (count >= limit) {
					res.send(403, "Sorry, our computers have reached their member creation limit," +
						" and nobody can join the site at this time.");
					return;
				}
				return callback();
			}));
		}
	};

	var checkUserCircleLimit = function (req, res, next) {
		db.circles.countByUser(req.user, guard(res, function (count) {
			// TODO: Put this hard-coded value into the settings.
			var maxCircleCount = 4;
			if (count >= maxCircleCount) {
				return res.send(403, "Sorry, you can only create " + maxCircleCount + " circles.");
			}

			next();
		}));
	};

	var checkUserStoryLimit = function (circleId, next) {
		
		checkStoryLimit(next);

		function getCircle (callback) {
			db.docs.get(circleId, function (err, circle) {
				if (err) {
					return callback(err);
				}

				if (circle.type !== "circle") {
					return callback("Sorry, the projectId specified is not a circle.");
				}

				callback(null, circle);
			});
		}

		function checkStoryLimit (callback) {
			async.parallel([db.settings.getAll, getCircle], function (err, results) {
				if (err) {
					return callback(err);
				}
				var settings = results[0];
				var circle = results[1];
				checkSettings(settings, circle, callback);
			});
		}

		function checkSettings(settings, circle, callback) {
			if (!settings['limit-stories-per-circle'] || !circle.isAnonymous) {
				// No limit!
				return callback(); 
			}

			var limit = settings['limit-stories-per-circle'].value;
			db.stories.countByCircleId(circleId, function (err, count) {
				if (err) {
					return callback(err);
				}
				if (count >= limit) {
					// TODO: Add validation-specific instructions, after 
					// we have an account validation mechanism.
					var message = "Sorry, this circle has reached its story-creation limit," +
						" and no more can be made at the moment.";

					var error = new Error(message);
					error.status = 403;
					return callback(error);
				}
				return callback();
			});
		}
	};

	// TODO: Combine with the code above
	var checkArchiveLimit = function (circleId, next) {
		
		checkArchiveLimit(next);

		function getCircle (callback) {
			db.docs.get(circleId, function (err, circle) {
				if (err) {
					return callback(err);
				}

				if (circle.type !== "circle") {
					return callback("Sorry, the listId specified is not a circle.");
				}

				callback(null, circle);
			});
		}

		function checkArchiveLimit (callback) {
			async.parallel([db.settings.getAll, getCircle], function (err, results) {
				if (err) {
					return callback(err);
				}
				var settings = results[0];
				var circle = results[1];
				checkSettings(settings, circle, callback);
			});
		}

		function checkSettings(settings, circle, callback) {
			if (!settings['limit-archives-per-circle'] || !circle.isAnonymous) {
				// No limit!
				return callback(); 
			}

			var limit = settings['limit-archives-per-circle'].value;
			db.archives.countByCircleId(circleId, function (err, count) {
				if (err) {
					return callback(err);
				}
				if (count >= limit) {
					// TODO: Add validation-specific instructions, after 
					// we have an account validation mechanism.
					var message = "Sorry, this circle has reached its archive-creation limit," +
						" and no more can be made at the moment.";

					var error = new Error(message);
					error.status = 403;
					return callback(error);
				}
				return callback();
			});
		}
	};

	return {
		circle: checkCircleLimit, // TODO: Move into 'server' obj
		archives: checkArchiveLimit,
		users: {
			total: checkMemberLimit,
			circle: checkUserCircleLimit, 
			story: checkUserStoryLimit  // TODO: Move into 'circle' obj
		}
	};
}(); // closure