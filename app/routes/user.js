var db = require('../lib/dataAccess.js').instance();

/*
 * GET user info
 */
exports.user = function (req, res) {
	res.send(req.user);
};

/*
 * PUT update user
 */
exports.update = function (req, res) {
	var data = req.body;

	if (req.user.id !== data.id) {
		var message = "It doesn't appear that you own the account you are trying to modify.";
		return res.send(412, message);
	}

	if (req.user.isReadOnly) {
		var message = "Sorry, the details of this account cannot be changed.";
		return res.send(403, message);
	}

	var onSuccess = function () {
		res.send(200);
	};

	var onError = function (err) {
		res.send(500, err);
	};

	// TODO: Security: Right now a user can update 
	// any property on his or her database record.
	//
	// At least prevent people from modifying their
	// access levels.
	db.users.update(data, onSuccess, onError);
};

/*
 * PUT update user password
 */
exports.updatePassword = function (req, res) {
	var data = req.body;

	if (req.user.isReadOnly) {
		var message = "Sorry, the details of this account cannot be changed.";
		return res.send(403, message);
	}

	if (!data.password) {
		return res.send(400, "Missing password field.");
	}

	var onSuccess = function () {
		res.send(200);
	};

	var onError = function (err) {
		res.send(500, err);
	};

	db.users.updatePassword(req.user, data.password, onSuccess, onError);
};