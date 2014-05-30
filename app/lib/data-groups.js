var couch = require('./couch.js');
couch.groups = require('./couch-groups.js');

module.exports = function () {

	var addGroup = function(group, success, failure) {
		var newGroup = {
			name: group.name,
			projectId: group.projectId,
			isPermanent: group.isPermanent
		};
		
		couch.groups.add(newGroup, function (err, body) {
			if (err) {
				return failure(err);
			}
			// TODO: what to return?
			success(body);
		});
	};

	var removeGroup = function(group, success, failure) {
		couch.groups.remove(group, function (err, body) {
			if (err) {
				return failure(err);
			}

			return success();
		});
	};

	var findGroupById = function (groupId, callback) {
		// TODO: Make the other get-by-id functions like this, perhaps.
		couch.docs.get(groupId, function (err, body) {
			if (err) {
				return callback(err);
			}

			if (body.type === "group") {
				return callback(null, body);
			}
			else {
				return callback({
					message: "Document is not a group: " + groupId
				});
			}
		});
	};

	var findGroupsByProjectId = function (projectId, callback) {

		var prepareGroups = function (err, dbGroups) {
			if (err) {
				return callback(err);
			}

			var groups = [];
			dbGroups.forEach(function (group, index, array) {
				// TODO: Not sure we need this modelGroup
				// business, except to cause more work
				// in the future.
				var modelGroup = {
					id: group._id,
					projectId: group.projectId,
					name: group.name,
					isPermanent: group.isPermanent
				};

				groups.push(modelGroup);
			});

			callback(err, groups);
		};

		couch.groups.findByProjectId(projectId, prepareGroups);
	};

	var findGroupsByUser = function(user, callback) {
		couch.groups.findByUser(user, callback);
	};

	return {
		add: addGroup,
		remove: removeGroup,
		findById: findGroupById,
		findByProjectId: findGroupsByProjectId,
		findByUser: findGroupsByUser
	};
}();