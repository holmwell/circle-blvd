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

		db.stories.add(story, function (err, body) {
			if (err) {
				return onError(err);
			}
			return onSuccess(body);
		});
	};

	var adminMemberships = [];
	var addAdminUser = function (userGroup) {

		adminMemberships.push({
			group: userGroup.id, // TODO: Config?
			level: "member"
		});

		var isReadOnly = false;
		db.users.add(
			"Admin", 
			data.email, 
			data.password, 
			adminMemberships,
			isReadOnly,
			addNextMeeting, onError
		);
	};

	var adminGroup = {
		name: "Administrative",
		projectId: "1",
		isPermanent: true
	};

	var gatekeeperGroup = {
		name: "Gatekeeper",
		isPermanent: true
	};

	db.groups.add(gatekeeperGroup,
		function (group) {
			adminMemberships.push({
				group: group.id,
				level: "member"
			});
			db.groups.add(adminGroup, addAdminUser, onError);		
		},
	onError);
};