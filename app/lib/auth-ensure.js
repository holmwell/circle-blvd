// auth-ensure.js
// 
// A companion to our passport.js implementation.
// Middleware for various access levels.

var ensureAuthenticated = function (req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.send(401, "Please authenticate with the server and try again.");
};


var ensureIsCircle = function (circleId, req, res, next) {
	var nope = function () {
		res.send(403, "User is not in the " + circleId + " circle.")
	}

	if (req.user.memberships) {
		var groups = req.user.memberships;
		for (var groupKey in groups) {
			if (groups[groupKey].circle === circleId) {
				return next();
			}
		}
	}

	return nope();
};

var ensureCircleAccess = function (req, res, next) {
	var circleId = req.params.circleId;
	if (!circleId) {
		return res.send(400, "Circle ID is required.");
	}

	ensureAuthenticated(req, res, function () {
		ensureIsCircle(circleId, req, res, next);
	});
};


var ensureIsCircleAdmin = function (circleId, req, res, next) {
	var nope = function () {
		res.send(403, "User is not in the " + circleId + " circle.")
	}

	if (req.user.memberships) {
		var groups = req.user.memberships;
		for (var groupKey in groups) {
			if (groups[groupKey].circle === circleId
				&& groups[groupKey].name === "Administrative") {
				return next();
			}
		}
	}

	return nope();
};

var ensureAdminCircleAccess = function (req, res, next) {
	var circleId = req.params.circleId;
	if (!circleId) {
		return res.send(400, "Circle ID is required.");
	}

	ensureAuthenticated(req, res, function () {
		ensureIsCircleAdmin(circleId, req, res, next);
	});
};


var ensureIsGroup = function (groupName, req, res, next) {
	var nope = function () {
		res.send(403, "User is not in the " + groupName + " group.")
	}

	if (req.user.memberships) {
		var groups = req.user.memberships;
		for (var groupKey in groups) {
			if (groups[groupKey].name === groupName) {
				return next();
			}
		}
	}

	return nope();
};

// Deprecated: 
//
// var ensureAdministrator = function (req, res, next) {
// 	ensureAuthenticated(req, res, function () {
// 		ensureIsGroup("Administrative", req, res, next);
// 	});
// };

var ensureMainframeAccess = function (req, res, next) {
	ensureAuthenticated(req, res, function () {
		ensureIsGroup("Mainframe", req, res, next);
	});
};





module.exports = function () {
	// TODO: This API is a bit wonky.
	return {
		auth: ensureAuthenticated,
		mainframe: ensureMainframeAccess,
		isCircle: ensureIsCircle,
		circle: ensureCircleAccess,
		circleAdmin: ensureAdminCircleAccess
	}	
}();