var couch = require('./data/couch/couch.js');

var data = {};
data.archives  = require('./data/archives.js');
data.circles   = require('./data/circles.js');
data.invites   = require('./data/invites.js');
data.docs      = require('./data/docs.js');
data.groups    = require('./data/groups.js');
data.settings  = require('./data/settings.js');
data.stories   = require('./data/stories.js');
data.lists     = require('./data/lists.js');
data.users     = require('./data/users.js');
data.waitlist  = require('./data/waitlist.js');
data.whenReady = couch.database.whenReady;

var addStoriesForFirstCircle = function (newCircle, adminAccount, callback) {

	var newStory = function () {
		var story = {};
		story.projectId = newCircle._id;
		return story;
	};

	// TODO: Do we want this 'welcome' task? (July 2015)
	// It's confusing, because it wasn't entered by a person.
	// 
	// var welcome = newStory();
	// welcome.summary = "Welcome! Please open me first";
	// welcome.status = "active";
	// welcome.isFirstStory = true;
	// welcome.description = "Hi! This is your task list. The main idea is that " +
	// "tasks closer to the top want to be completed before the ones closer " + 
	// "to the bottom.\n\nPlay around with it. Maybe start by moving the 'Next meeting' task " +
	// "around, or add a few tasks.\n\nAdd more people to this circle from " +
	// "the admin page, and you can make more circles from your profile page.";

	var nextMeeting = newStory();
	nextMeeting.summary = "Next planning meeting";
	nextMeeting.isNextMeeting = true;

	var stories = [
//		welcome,
		nextMeeting
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

var addStoriesForNewCircle = function (newCircle, adminAccount, callback) {
	var newStory = function () {
		return newStoryInCircle(newCircle);
	};

	var nextMeeting = {};
	nextMeeting.projectId = newCircle._id;
	nextMeeting.summary = "Next planning meeting";
	nextMeeting.isNextMeeting = true;

	db.stories.add(nextMeeting, callback);	
};

var createCircle = function (circleName, adminEmailAddress, createStories, callback) {
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

			createStories(newCircle, adminAccount, function (err, body) {
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

data.circles.create = function (circleName, adminEmailAddress, callback) {
	createCircle(circleName, adminEmailAddress, addStoriesForNewCircle, callback);
};

data.circles.createFirst = function (circleName, adminEmailAddress, callback) {
	createCircle(circleName, adminEmailAddress, addStoriesForFirstCircle, callback);
};


var db = function() {
	return data;
}();


exports.instance = function() {
	return db;
};
