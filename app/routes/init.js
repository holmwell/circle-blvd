var db = require('../lib/dataAccess.js').instance();

exports.init = function (req, res) {
	var onSuccess = function() {
		res.send(200);
	};

	var onError = function (err) {
		res.send(500, err);
	};

	var addNextMeeting = function () {
		var story = {};	
		story.projectId = "1";
		story.summary = "Next meeting";
		story.isNextMeeting = true;

		db.stories.add(story, onSuccess, onError);
	};

	var addSettings = function () {
		var demoSetting = {
			name: "demo",
			value: false,
			visibility: "public"
		};

		var sslKeySetting = {
			name: "ssl-key-path",
			value: null,
			visibility: "private"
		};

		var sslCertSetting = {
			name: "ssl-cert-path",
			value: null,
			visibility: "private"
		};

		var sslCaSetting = {
			name: "ssl-ca-path",
			value: null,
			visibility: "private"
		};

		// TODO: It would be nice to make this sane.
		db.settings.add(demoSetting, function () {
				db.settings.add(sslKeySetting, function () {
					db.settings.add(sslCertSetting, function () {
						db.settings.add(sslCaSetting, function () {
							addNextMeeting();	
						}, onError);
					}, onError);
				}, onError);
			}, onError);
	};

	var addAdminUser = function (userGroup) {
		var data = req.body;

		var memberships = [{
			group: userGroup.id, // TODO: Config?
			level: "member"
		}];

		var isReadOnly = false;
		db.users.add(
			"Admin", 
			data.email, 
			data.password, 
			memberships,
			isReadOnly,
			addSettings, onError
		);
	};

	var adminGroup = {
		name: "Administrative",
		projectId: "1",
		isPermanent: true
	};

	db.groups.add(adminGroup, addAdminUser, onError);
};