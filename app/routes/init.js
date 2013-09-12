var db = require('../lib/dataAccess.js').instance();

exports.init = function (req, res) {
	var data = req.body;

	var onSuccess = function() {
		res.send(200);
	};

	var onError = function (err) {
		res.send(500, err);
	};

	db.users.add("Admin", data.email, data.password, onSuccess, onError);
};