var db = require('../lib/dataAccess.js').instance();

exports.init = function (req, res) {
	var onSuccess = function() {
		res.send(200);
	};

	var onError = function (err) {
		res.send(500, err);
	};

	var adminGroup = {
		name: "Administrative",
		projectId: "1",
		isPermanent: true
	};

	var addDemoMode = function () {
		var demoSetting = {
			name: "demo",
			value: false,
			visibility: "public"
		};

		db.settings.add(demoSetting, onSuccess, onError);
	};

	var addAdminUser = function (userGroup) {
		var data = req.body;

		var memberships = [{
			group: userGroup.id, // TODO: Config?
			level: "member"
		}];

		db.users.add(
			"Admin", 
			data.email, 
			data.password, 
			memberships,
			addDemoMode, onError
		);
	};

	db.groups.add(adminGroup, addAdminUser, onError);
};