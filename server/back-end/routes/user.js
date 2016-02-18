var db = require('circle-blvd/dataAccess');

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
		return res.status(412).send(message);
	}

	if (req.user.isReadOnly) {
		var message = "Sorry, the details of this account cannot be changed.";
		return res.status(403).send(message);
	}

	next();
};

exports.updateName = function (req, res) {
	var onSuccess = function () {
		res.sendStatus(200);
	};

	var onError = function (err) {
		console.log(err);
		res.status(500).send(err);
	};

	basicChecks(req, res, function () {
		var data = req.body;
		var user = req.user;
		db.users.updateName(user, data.name, onSuccess, onError);
	});
};

exports.updateEmail = function (req, res) {
	var onSuccess = function () {
		res.sendStatus(200);
	};

	var onError = function (err) {
		res.status(500).send(err);
	};
	
	basicChecks(req, res, function () {
		var data = req.body;
		var user = req.user;
		db.users.updateEmail(user, data.email, onSuccess, onError);
	});
};

exports.updateNotificationEmail = function (req, res) {
	var onSuccess = function () {
		res.sendStatus(200);
	};

	var onError = function (err) {
		console.log(err);
		res.status(500).send("Sorry, the website is broken right now.");
	};
	
	basicChecks(req, res, function () {
		var data = req.body;
		var user = req.user;
		db.users.updateNotificationEmail(user, data.notificationEmail, onSuccess, onError);
	});
};

/*
 * PUT update user password
 */
exports.updatePassword = function (req, res) {
	var data = req.body;

	if (req.user.isReadOnly) {
		var message = "Sorry, the details of this account cannot be changed.";
		return res.status(403).send(message);
	}

	if (!data.password) {
		return res.status(400).send("Missing password field.");
	}

	var onSuccess = function () {
		res.sendStatus(200);
	};

	var onError = function (err) {
		res.status(500).send(err);
	};

	db.users.updatePassword(req.user, data.password, onSuccess, onError);
};