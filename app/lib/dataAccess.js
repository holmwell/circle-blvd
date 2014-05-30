var encrypt = require('./encrypt.js');
var uuid 	= require('node-uuid');

var couch = require('./couch.js');
couch.stories = require('./couch-stories.js');

var data = {};
data.settings = require('./data-settings.js');
data.stories = require('./data-stories.js');


var db = function() {

	var addCircle = function (circle, callback) {
		var newCircle = {
			name: circle.name
		};

		couch.circles.add(newCircle, function (err, body) {
			if (err) {
				return callback(err);
			}

			newCircle._id = body.id;
			newCircle._rev = body.rev;
			callback(null, newCircle);
		});
	};

	var updateCircle = function (circle, callback) {
		couch.circles.update(circle, callback);
	};


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


	var isValidUser = function(user) {
		return user && user.email && user.id;
	};

	var findUserByEmail = function(userEmail, callback) {
		if (userEmail) {
			userEmail = userEmail.toLowerCase();
		}
		couch.users.findByEmail(userEmail, callback);
	};

	var findUserById = function(id, callback) {
		couch.users.findById(id, callback);
	};

	var findUserByCircleAndName = function (circleId, name, callback) {
		couch.users.findByCircleAndName(circleId, name, callback);
	};

	var findUsersByCircleId = function (circleId, callback) {
		couch.users.findByCircleId(circleId, callback);
	};

	var findNamesByCircleId = function (circleId, callback) {
		couch.users.findNamesByCircleId(circleId, callback);
	};

	var findUsersById = function (idArray, callback) {
		couch.users.findMany(idArray, callback);
	};

	var normalizeUser = function (user) {
		if (user.email) {
			user.email = user.email.toLowerCase();
		}
		if (user.notifications && user.notifications.email) {
			user.notifications.email = user.notifications.email.toLowerCase();
		}

		return user;
	}

	// TODO: Refactor this to have one parameter for the user.
	var addUser = function(name, email, password, memberships, isReadOnly, success, failure) {
		var user = {
			name: name,
			email: email,
			id: uuid.v4(),
			memberships: memberships,
			isReadOnly: isReadOnly
		};
		
		if (!isValidUser(user)) {
			return failure("User cannot be null?");
		}

		var addUser = function (user, password) {
			user = normalizeUser(user);
			couch.users.add(user, password, function (err, body) {
				if (err) {
					return failure(err);
				}

				user._id = body.id;
				user._rev = body.rev;
				success(user);	
			});
		};

		findUserById(user.id, function (err, body) {
			// TODO: Handle db errors.
			if (body) {
				// TODO: Error codes, etc.
				// This is an internal error.
				return failure("User already exists.");
			}
			findUserByEmail(user.email, function (err, body) {
				if (body) {
					//TODO: Error?
					// This is an external error.
					return failure("User email already exists");
				}
				addUser(user, password);
			});
		});
	};
	
	var removeUser = function(user, success, failure) {
		if (!(user && user.email)) {
			return failure("User not found.");
		}

		couch.users.remove(user, function (err, body) {
			if (err) {
				return failure(err);
			}
			return success();
		});
	};

	var updateUser = function(user, success, failure) {
		if (!isValidUser(user)) {
			return failure();
		}

		user = normalizeUser(user);
		couch.users.update(user, function (err, body) {
			if (err) {
				return failure(err);
			}
			user._rev = body.rev;
			success(user);
		});
	};

	var updateUserPassword = function(user, password, success, failure) {
		if (!isValidUser(user)) {
			return failure("Need a valid user. Sorry.");
		}

		couch.users.updatePassword(user, password, function (err) {
			if (err) {
				return failure(err);
			}
			success();
		});
	};

	var validateUserPassword = function(user, password, success, failure) {
		if(!isValidUser(user)) {
			return failure();
		}

		couch.passwords.findById(user.id, function (err, pass) {
			if (err || !pass) {
				return failure();
			}

			var salt = pass.salt;
			var hash = pass.hash;	
			if(encrypt.hash(password, salt) === hash) {
				return success();
			}
			return failure();
		});
	};


	return {
		whenReady: couch.database.whenReady,
		settings: data.settings,
		stories: data.stories,
		circles: {
			add: addCircle,
			getAll: function (callback) {
				couch.circles.getAll(callback);
			},
			findByUser: function (user, callback) {
				couch.circles.findByUser(user, callback);
			},
			update: updateCircle
		},
		groups: {
			add: addGroup,
			remove: removeGroup,
			findById: findGroupById,
			findByProjectId: findGroupsByProjectId,
			findByUser: findGroupsByUser
		},
		docs: {
			get: function(docId, callback) {
				couch.docs.get(docId, callback);
			}
		},
		archives: {
			addStories: addStoriesToArchive,
			findByCircleId: findArchivesByCircleId
		},
		users: { 
			add: addUser,
			remove: removeUser,
			findByEmail: findUserByEmail,
			findById: findUserById, 
			findByCircleAndName: findUserByCircleAndName,
			findByCircleId: findUsersByCircleId,
			findNamesByCircleId: findNamesByCircleId,
			findMany: findUsersById,
			update: updateUser,
			updatePassword: updateUserPassword,
			validatePassword: validateUserPassword,
			getAll: function(callback) {
				couch.users.getAll(callback);
			},
			count: function(callback) {
				couch.users.getAll(function (err, users) {
					var userCount = users ? users.length : null;
					callback(err, userCount);
				});
			}
		}
	};
}();


exports.instance = function() {
	return db;
};
