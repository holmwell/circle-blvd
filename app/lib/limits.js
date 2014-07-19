// limits.js
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

	return {
		circle: checkCircleLimit
	};
}(); // closure