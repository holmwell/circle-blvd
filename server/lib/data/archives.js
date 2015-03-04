var couch      = require('./couch/couch.js');
couch.stories  = require('./couch/stories.js');
couch.archives = require('./couch/archives.js');

module.exports = function () {

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

	var findArchivesByCircleId = function (circleId, params, callback) {
		couch.archives.findByCircleId(circleId, params, callback);
	};

	var countArchivesByCircleId = function (circleId, callback) {
		couch.archives.countByCircleId(circleId, callback);
	};

	return {
		addStories: addStoriesToArchive,
		findByCircleId: findArchivesByCircleId,
		countByCircleId: countArchivesByCircleId
	};
}(); // closure