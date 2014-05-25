var db = require('../lib/dataAccess.js').instance();

exports.init = function (req, res) {
	var data = req.body;
	var defaultCircleId = "1";

	var onSuccess = function() {
		res.send(200);
	};

	var onError = function (err) {
		res.send(500, err);
	};

	// TODO: This should be consolidated with
	// the add-new-circle code in server.js
	var addNextMeeting = function () {
		var story = {};	
		story.projectId = defaultCircleId;
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
			circle: defaultCircleId,
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

	var mainframeGroup = {
		name: "Mainframe",
		isPermanent: true
	};

	var firstCircle = {
		name: "Circle Blvd"
	};

	db.circles.add(firstCircle, function (err, newCircle) {
		defaultCircleId = newCircle._id;
		db.groups.add(mainframeGroup, function (rootGroup) {
			var adminGroup = {
				name: "Administrative",
				projectId: defaultCircleId,
				isPermanent: true
			};

			var impliedGroup = {
				name: "_implied",
				projectId: defaultCircleId,
				isPermanent: true
			};

			db.groups.add(impliedGroup, function (memberGroup) {
					adminMemberships.push({
						circle: defaultCircleId,
						group: memberGroup.id,
						level: "member"
					});
					adminMemberships.push({
						// no circle
						group: rootGroup.id,
						level: "member"
					});
					db.groups.add(adminGroup, addAdminUser, onError);
				}, onError);
		}, onError);
	});
};