var couch = require('./couch.js');
var database = couch.db;

module.exports = function () {

	var addGroup = function(group, callback) {
		group.type = "group";
		console.log("Adding ...");
		console.log(group);
		database.insert(group, callback);
	};

	var findGroupById = function (groupId, callback) {
		var key = groupId;
		couch.findOneByKey("groups/byId", key, callback);
	};

	var removeGroup = function (group, callback) {
		console.log("Removing ...");
		console.log(group);

		findGroupById(group.id, function (err, groupToRemove) {
			if (err) {
				return callback(err);
			}

			if (groupToRemove.isPermanent) {
				return callback({
					message: "Cannot remove group. It is marked as permanent."
				});
			}

			database.destroy(groupToRemove._id, groupToRemove._rev, function (err, body) {
				if (err) {
					return callback(err);
				}
				else {
					return callback();
				}
			});
		});
	};

	var findGroupsByCircleId = function (circleId, callback) {
		var options = {
			key: circleId
		};
		couch.view("groups/byCircleId", options, function (err, rows) {
			callback(err, rows);
		});
	};

	var findGroupsByUser = function (user, callback) {
		var groupIds = [];

		for (var membershipKey in user.memberships) {
			var membership = user.memberships[membershipKey];
			groupIds.push(membership.group);
		}

		couch.fetch(groupIds, callback);
	};

	return {
		add: addGroup,
		remove: removeGroup,
		findById: findGroupById,
		findByProjectId: findGroupsByCircleId,
		findByUser: findGroupsByUser
	};
}(); // closure