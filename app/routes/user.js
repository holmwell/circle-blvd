var db = require('../lib/dataAccess.js').instance();

/*
 * GET user info
 */
exports.user = function (req, res) {
	res.send(req.user);
};


var basicChecks = function (req, res, next) {
	var data = req.body;

	if (req.user.id !== data.id) {
		var message = "It doesn't appear that you own the account you are trying to modify.";
		return res.send(412, message);
	}

	if (req.user.isReadOnly) {
		var message = "Sorry, the details of this account cannot be changed.";
		return res.send(403, message);
	}

	next();
};

exports.updateName = function (req, res) {
	var onSuccess = function () {
		res.send(200);
	};

	var onError = function (err) {
		console.log(err);
		res.send(500, "Sorry, the website is broken right now.");
	};

	basicChecks(req, res, function () {
		var data = req.body;
		var user = req.user;
		user.name = data.name;
		db.users.update(user, onSuccess, onError);
	});
};

exports.updateEmail = function (req, res) {
	var onSuccess = function () {
		res.send(200);
	};

	var onError = function (err) {
		console.log(err);
		res.send(500, "Sorry, the website is broken right now.");
	};
	
	basicChecks(req, res, function () {
		var data = req.body;
		var user = req.user;
		user.email = data.email;
		db.users.update(user, onSuccess, onError);
	});
};

exports.updateNotificationEmail = function (req, res) {
	var onSuccess = function () {
		res.send(200);
	};

	var onError = function (err) {
		console.log(err);
		res.send(500, "Sorry, the website is broken right now.");
	};
	
	basicChecks(req, res, function () {
		var data = req.body;
		var user = req.user;
		user.notifications = user.notifications || {};
		user.notifications.email = data.notificationEmail;
		db.users.update(user, onSuccess, onError);
	});
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