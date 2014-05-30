var couch = require('./couch.js');
couch.stories = require('./couch-stories.js');

var data = {};
data.circles  = require('./data-circles.js');
data.groups   = require('./data-groups.js');
data.settings = require('./data-settings.js');
data.stories  = require('./data-stories.js');
data.users    = require('./data-users.js');

var db = function() {

	var addStoriesToArchive = function (stories, success, failure) {
		var count = 0;
		var archives = [];

		var storyIds = [];
		stories.forEach(function (story) {
			storyIds.push(story.id);
		});

		couch.stories.findMany(storyIds, function (err, body) {
			if (err) {
				return failure(err);
			}

			var storiesToArchive = [];
			body.rows.forEach(function (record) {
				if (record.doc.type === "story") {
					storiesToArchive.push(record.doc);	
				}
			});;

			storiesToArchive.forEach(function (story) {
				var archive = {};

				archive.storyId = story.id;
				archive.projectId = story.projectId;
				archive.summary = story.summary;
				archive.owner = story.owner;
				archive.status = story.status;
				archive.description = story.description;
				archive.comments = story.comments || [];

				archive.isDeadline = story.isDeadline;
				archive.createdBy = story.createdBy;

				archive.timestamp = Date.now();
				archive.sortIndex = "" + archive.timestamp + "." + count;
				count++;

				archives.push(archive);
			});

			couch.archives.add(archives, function (err, body) {
				if (err) {
					return failure(err);
				}

				return success(body);
			});
		});
	};

	var findArchivesByCircleId = function (circleId, callback) {
		couch.archives.findByCircleId(circleId, callback);
	};


	return {
		archives: {
			addStories: addStoriesToArchive,
			findByCircleId: findArchivesByCircleId
		},
		circles: data.circles,
		docs: {
			get: function(docId, callback) {
				couch.docs.get(docId, callback);
			}
		},
		groups: data.groups,
		settings: data.settings,
		stories: data.stories,
		whenReady: couch.database.whenReady,
		users: data.users
	};
}();


exports.instance = function() {
	return db;
};
