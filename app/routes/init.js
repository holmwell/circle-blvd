var db = require('../lib/dataAccess.js').instance();

exports.init = function (req, res) {
	var data = req.body;

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

		db.stories.add2(story, function (err, body) {
			if (err) {
				return onError(err);
			}
			return onSuccess(body);
		});
	};

	var addAdminUser = function (userGroup) {

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
			addNextMeeting, onError
		);
	};

	var adminGroup = {
		name: "Administrative",
		projectId: "1",
		isPermanent: true
	};

	db.groups.add(adminGroup, addAdminUser, onError);
};