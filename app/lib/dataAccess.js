var couch = require('./data/couch/couch.js');

var data = {};
data.archives  = require('./data/archives.js');
data.circles   = require('./data/circles.js');
data.docs      = require('./data/docs.js');
data.groups    = require('./data/groups.js');
data.settings  = require('./data/settings.js');
data.stories   = require('./data/stories.js');
data.users     = require('./data/users.js');
data.waitlist  = require('./data/waitlist.js');
data.whenReady = couch.database.whenReady;

var addStoriesForNewCircle = function (newCircle, adminAccount, callback) {
	
	var newStory = function () {
		var story = {};
		story.projectId = newCircle._id;
		return story;
	};

	var welcome = newStory();
	welcome.summary = "Welcome to Circle Blvd.";
	welcome.status = "active";
	welcome.isFirstStory = true;
	welcome.description = "Hi! This is a story list. The main idea is that " +
	"stories closer to the top want to be completed before the ones closer " + 
	"to the bottom.\n\nPlay around with it. Maybe start by moving the 'Next " + 
	"meeting' around.";

	var addStories = newStory();
	addStories.summary = "To get started, add a few stories";
	addStories.owner = adminAccount.name;
	addStories.description = "Please see the 'Add story' link, at the top " +
	"of the story list, to get started.";

	var addTeamMembers = newStory();
	addTeamMembers.summary = "When you're ready, add some team members";
	addTeamMembers.status = "assigned";
	addTeamMembers.description = "You can do this from the Admin page.";

	var seeDocs = newStory();
	seeDocs.summary = "Check out the documentation for more details";

	var readyMilepost = newStory();
	readyMilepost.isDeadline = true;
	readyMilepost.summary = "Start using the site";

	var nextMeeting = newStory();
	nextMeeting.summary = "Next meeting";
	nextMeeting.isNextMeeting = true;

	var subscribe = newStory();
	subscribe.summary = "Become a sponsor, if you want";
	subscribe.owner = adminAccount.name;
	subscribe.description = "Circle Blvd. may be used for free, for a reasonable " +
	"amount of time. Like Wikipedia, we rely on donations to keep the site online. You " +
	"can sponsor the site from the profile page, and end your sponsorship at any time.";

	var haveFun = newStory();
	haveFun.summary = "Have fun :-)";
	haveFun.status = "assigned";
	haveFun.description = "Please enjoy using our site. To send us a note, you can find " + 
	"us on Twitter at @circleblvd. Thank you!";

	var stories = [
		welcome,
		addStories,
		addTeamMembers,
		seeDocs,
		readyMilepost,
		nextMeeting,
		subscribe,
		haveFun
	];
	stories.reverse();

	var currentIndex = 0;

	var addStory = function (story, nextId) {
		if (nextId) {
			story.nextId = nextId;
		}
		db.stories.add(story, function (err, body) {
			if (err) {
				return callback(err);
			}
			currentIndex++;
			if (currentIndex >= stories.length) {
				callback();
			}
			else {
				addStory(stories[currentIndex], body.id);
			}
		});	
	};

	addStory(stories[currentIndex]);
};

data.circles.create = function (circleName, adminEmailAddress, callback) {
	var circle = {
		name: circleName
	};

	db.users.findByEmail(adminEmailAddress, function (err, adminAccount) {
		if (err) {
			return callback(err);
		}

		circle.createdBy = {
			name: adminAccount.name,
			id: adminAccount._id
		};

		db.circles.add(circle, function (err, newCircle) {
			if (err) {
				return callback(err);
			}

			var administrativeGroup = {
				name: "Administrative",
				projectId: newCircle._id,
				isPermanent: true
			};

			var impliedGroup = {
				name: "_implied",
				projectId: newCircle._id,
				isPermanent: true
			};

			addStoriesForNewCircle(newCircle, adminAccount, function (err, body) {
				if (err) {
					return callback(err);
				}

				db.groups.add(administrativeGroup, function (adminGroup) {
					db.groups.add(impliedGroup, function (memberGroup) {

						var addCircleMembershipsToAdmin = function (account) {
							// admin access
							account.memberships.push({
								circle: newCircle._id,
								group: adminGroup.id,
								level: "member"
							});
							// member access
							account.memberships.push({
								circle: newCircle._id,
								group: memberGroup.id,
								level: "member"
							});

							db.users.update(account, 
								function (body) {
									callback(null, newCircle);
								},
								function (err) {
									callback(err);
								}
							);
						};

						if (adminAccount) {
							addCircleMembershipsToAdmin(adminAccount);
						}
						else {
							var err = {};
							err.message = "Admin account was not found. Cannot create circle " +
							"witout an exiting admin account.";
							callback(err);
						}
					},
					function (err) {
						// failure adding member group
						callback(err);
					});
				},
				function (err) {
					// failure adding admin group
					callback(err);
				});
			});

		})
	});
};

var db = function() {
	return data;
}();


exports.instance = function() {
	return db;
};
