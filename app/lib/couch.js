var nano = require('nano');
var views = require('./views.js');
var encrypt = require('./encrypt.js');
var uuid 	= require('node-uuid');

var couch = function() {
	var databaseUrl = 'http://localhost:5984';
	// TODO: Ideally, we want to make the database automatically
	// if 'circle-blvd' doesn't already exist on first run, and if
	// it does then ask for a new database name. For now, we're
	// letting future selves figure that out.
	var databaseName = 'circle-blvd';

	// Connect to Couch! 
	var database, nanoMaster;
	var databaseOptions = {};
	databaseOptions.url = databaseUrl;
	var nanoMaster = nano(databaseOptions);
	var database = nanoMaster.use(databaseName);
	var isDatabaseReady = false;

	var databaseExists = function (callback) {
		var opts = {
			db: databaseName,
			method: "GET"
		};

		nanoMaster.relax(opts, function (err, body) {
			if (err && err['status-code'] === 404) {
				callback(null, false);
			}
			else if (err) {
				callback(err);
			}
			else {
				callback(null, true);
			}
		});
	};

	var createDatabase = function (callback) {
		var opts = {
			db: databaseName,
			method: "PUT"
		};

		nanoMaster.relax(opts, callback);
	};

	var createDatabaseAndViews = function(callback) {
		// Create database!
		databaseExists(function (err, exists) {
			if (err) {
				throw (err);
			}
			else if (exists) {
				views.create(database, callback);
			}
			else {
				createDatabase(function (err) {
					if (err) {
						console.log(err);
						callback(err);
					}
					else {
						views.create(database, callback);		
					}
				});
			}
		});
	};

	// getView(viewUrl, [options], callback)
	var getView = function(viewUrl, viewGenerationOptions, callback) {
		var splitViewUrl = viewUrl.split('/');
		var designName = splitViewUrl[0];
		var viewName = splitViewUrl[1];

		if (typeof viewGenerationOptions === "function") {
			callback = viewGenerationOptions;
			viewGenerationOptions = {};
		}

		database.view(designName, viewName, viewGenerationOptions, function (err, body, headers) {
			if (err) {
				callback(err);
				return;
			}
			
			if (viewGenerationOptions.returnKeys) {
				var docs = {};
				body.rows.forEach(function (doc) {
					docs[doc.key] = doc.value;
				});
			}
			else {
				var docs = [];
				body.rows.forEach(function (doc) {
					docs.push(doc.value);
				});	
			}
			
			callback(null, docs);
		});
	};

	var findOneByKey = function(viewName, key, callback) {
		var options = {
			limit: 1,
			key: key
		};
		getView(viewName, options, function (err, rows) {
			var doc = null;
			if (err) {
				callback(err);
			}
			else if (rows && rows.length > 0) {
				doc = rows[0];
			}
			callback(null, doc);
		});		
	}

	var findStoryByIds = function (projectId, storyId, callback) {
		var key = projectId + "," + storyId;
		findOneByKey("stories/byIds", key, callback);
	};

	var findUserByEmail = function(email, callback) {
		findOneByKey("users/byEmail", email, callback);
	};

	var findUserById = function(id, callback) {
		findOneByKey("users/byId", id, callback);
	};

	var findUserByName = function (name, callback) {
		if (name) {
			name = name.toLowerCase();
		}
		else {
			return callback(null, undefined);
		}
		var options = {
			key: name
		};
		getView("users/byName", options, function (err, users) {
			// TODO: This (the error messages) should probably be in the 
			// data access layer. This file should probably just be for
			// bare database access / making sure the queries are correct.
			if (users.length > 1) {
				return callback({
					message: "More than one user was found by that name: " + name
				});
			}

			if (users.length === 0) {
				return callback({
					message: "Nobody was found with that name."
				});
			}

			callback(null, users[0]);
		});
	};

	var findUsersById = function (idList, callback) {
		var query = {};
		var usersFound = [];

		// TODO: Would be nice to combine this duplicate code with
		// the other fetch operation.
		if (idList.length > 0) {
			query["keys"] = idList;
			database.fetch(query, function (err, body) {
				if (err) {
					return callback(err);
				}
				else {
					// TODO: This deals with raw user objects, which
					// might not be what we want.
					for (var rowIndex in body.rows) {
						usersFound.push(body.rows[rowIndex].doc);
					}
					return callback(null, usersFound);
				}
			});
		}
		else {
			callback(null, usersFound);
		}
	};

	var findPasswordById = function (id, callback) {
		findOneByKey("passwords/byId", id, callback);
	};

	var createPasswordDoc = function (userId, password) {
		var salt = encrypt.salt();
		var hash = encrypt.hash(password, salt);
		var pass = {
			"userId": userId,
			"hash":hash, 
			"salt":salt,
			"type": "password"
		};

		return pass;
	};

	var addUser = function(user, password, callback) {
		user.type = "user";
		database.insert(user, function (err) {
			if (err) {
				return callback(err);
			}

			var pass = createPasswordDoc(user.id, password);
			database.insert(pass, callback);
		});
	};

	var removeUser = function (user, callback) {
		findPasswordById(user.id, function (err, pass) {
			if (err) {
				return callback(err);
			}
			// TODO: Make this a transaction.
			database.destroy(pass._id, pass._rev, function (err, body) {
				if (err) {
					return callback(err);
				}
				database.destroy(user._id, user._rev, callback);
			});
		});
	};

	var updateUser = function(user, callback) {
		findUserById(user.id, function (err, body) {
			if (err) {
				return callback(err);
			}
			// TODO: Where is the right place to change the appropriate fields?
			// As this stands, this method has to be updated whenever there
			// is a change to the user model.
			user._id = body._id;
			user._rev = body._rev;
			user.memberships = body.memberships;
			user.type = body.type;

			database.insert(user, callback);
		});
	};

	var updateUserPassword = function (user, password, callback) {
		findPasswordById(user.id, function (err, body) {
			if (err) {
				return callback(err);
			}

			var pass = createPasswordDoc(user.id, password);
			pass._id = body._id;
			pass._rev = body._rev;

			database.insert(pass, callback);
		});
	};

	var getAllUsers = function(callback) {
		getView("users/byId", function (err, rows) {
			callback(err, rows);
		});
	};

	var getSettingsView = function (viewName, callback) {
		// TODO: If there are two settings with the same name,
		// things might not behave well.
		var options = {
			returnKeys: true
		};
		getView("settings/" + viewName, options, callback);
	};

	var getSettings = function (callback) {
		getSettingsView("public", callback);
	};

	var getAuthorizedSettings = function (callback) {
		getSettingsView("authorized", callback);
	};

	var getPrivateSettings = function (callback) {
		getSettingsView("private", callback);
	};

	var getAllSettings = function (callback) {
		getSettingsView("all", callback);
	};

	var addSetting = function(setting, callback) {
		setting.type = "setting";
		database.insert(setting, callback);
	};

	var updateSetting = function (setting, callback) {
		console.log("Updating ...");
		console.log(setting);
		database.get(setting._id, function (err, settingToUpdate) {

			if (settingToUpdate.type !== "setting") {
				console.log(settingToUpdate);
				return callback({
					message: "Attempt to update a non-setting."
				});
			}

			var doc = {};
			doc._id = settingToUpdate._id;
			doc._rev = settingToUpdate._rev;
			doc.type = settingToUpdate.type;
			doc.name = settingToUpdate.name;

			doc.value = setting.value;
			doc.visibility = setting.visibility || settingToUpdate.visibility;

			database.insert(doc, function (err, body) {
				if (err) {
					callback(err);
				}
				else {
					doc._id = body._id;
					doc._rev = body._rev;
					callback(null, doc);
				}
			});
		});
	};


	var addGroup = function(group, callback) {
		group.type = "group";
		console.log("Adding ...");
		console.log(group);
		database.insert(group, callback);
	};

	var findGroupById = function (groupId, callback) {
		var key = groupId;
		findOneByKey("groups/byId", key, callback);
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

	var findGroupsByProjectId = function (projectId, callback) {
		var options = {
			key: projectId
		};
		getView("groups/byProjectId", options, function (err, rows) {
			callback(err, rows);
		});
	};

	var findGroupsByUser = function (user, callback) {
		var query = {};
		var groupIds = [];
		var groupsFound = [];

		for (var membershipKey in user.memberships) {
			var membership = user.memberships[membershipKey];
			groupIds.push(membership.group);
		}

		if (groupIds.length > 0) {
			query["keys"] = groupIds;
			database.fetch(query, function (err, body) {
				if (err) {
					return callback(err);
				}
				else {
					for (var rowIndex in body.rows) {
						groupsFound.push(body.rows[rowIndex].doc);
					}
					return callback(null, groupsFound);
				}
			});
		}
		else {
			callback(null, groupsFound);
		}
	};


	var addArchives = function(archives, callback) {
		var bulkDoc = {};
		var options = {};
		bulkDoc.docs = [];

		archives.forEach(function (archive) {
			archive.type = "archive";
			bulkDoc.docs.push(archive);
		});
		database.bulk(bulkDoc, options, callback);
	};

	var findArchivesByProjectId = function (projectId, callback) {
		var options = {
			startKey: [projectId,"{}"],
			descending: true
		};
		getView("archives/byProjectId", options, function (err, rows) {
			callback(err, rows);
		});
	};


	var addStory = function(story, callback) {
		// TODO: If we keep this (setting the story.type), 
		// we want a way to tell the client how we modified it.
		story.type = "story";
		console.log("Adding ...");
		console.log(story);
		database.insert(story, callback);
	};

	var removeStory = function(story, callback) {
		findStoryByIds(story.projectId, (story.id || story._id), function (err, body) {
			if (err) {
				return callback(err);
			}

			if (story === null) {
				// Tried to remove a story that already is gone. 
				// Relax.
				return callback(null, null);
			}

			story._id = body._id;
			story._rev = body._rev;

			database.destroy(story._id, story._rev, function (err, body) {
				callback(err, body);
			});
		});
	};


	var findStoryById = function (storyId, callback) {
		getView("stories/byId", {key: storyId}, function (err, rows) {
			if (err) {
				callback(err);
			}
			else {
				if (rows.length > 0) {
					callback(null, rows[0]);
				}
				else {
					callback(null, null);
				}
			}
		});
	};

	var findStoriesById = function (keys, callback) {
		var query = {};
		query["keys"] = keys;
		database.fetch(query, callback);
	};

	var findStoriesByProjectId = function (projectId, callback) {
		var options = {
			key: projectId
		};
		getView("stories/byProjectId", options, function (err, rows) {
			callback(err, rows);
		});
	};

	var findStoriesByNextId = function (nextId, callback) {
		// this works since nextIds are universal-unique ids.
		// in other words, we don't need a projectId.
		//
		// TODO: LIES, each project has a story with a "last" nextId
		getView("stories/byNextId", {key: nextId}, callback);
	}

	var findFirstByProjectId = function (projectId, callback) {
		getView(
			"stories/firstsByProjectId",
			{key: projectId}, 
			function (err, rows) {
				if (err) {
					callback(err);
				}
				else {
					if (rows.length > 0) {
						// TODO: If rows.length > 1 then we
						// have a data integrity issue.
						callback(null, rows[0]);
					}
					else {
						callback(null, null);
					}
				}
			}
		);
	};

	var findNextMeetingByProjectId = function (projectId, callback) {
		// TODO: Combine with the method above.
		getView(
			"stories/nextMeetingByProjectId",
			{key: projectId}, 
			function (err, rows) {
				if (err) {
					callback(err);
				}
				else {
					if (rows.length > 0) {
						// TODO: If rows.length > 1 then we
						// have a data integrity issue.
						callback(null, rows[0]);
					}
					else {
						callback(null, null);
					}
				}
			}
		);
	};


	var n = function(s) {
		return s || "";
	}

	var areStoriesEqual = function (a, b) {
		// TODO: a 'for in' loop
		// Also, do we even need this?
		return n(a.id) === n(b.id)
		&& n(a.type) === n(b.type)
		&& n(a.nextId) === n(b.nextId)
		&& n(a.isFirstStory) === n(b.isFirstStory)
		&& n(a.projectId) === n(b.projectId)
		&& n(a.summary) === n(b.summary)
		&& n(a.description) === n(b.description)
		&& n(a.status) === n(b.status)
		&& n(a.owner) === n(b.owner)
		&& n(a.isDeadline) === n(b.isDeadline)
		&& n(a.isNextMeeting) === n(b.isNextMeeting)
		&& n(a.comments).length === n(b.comments).length
		&& n(a.isOwnerNotified) === n(b.isOwnerNotified)
		&& n(a.isInserting) === n(b.isInserting);
	};

	var updateStory = function (story, callback) {
		if (!story) {
			return callback();
		}

		findStoryByIds(story.projectId, (story.id || story._id), function (err, body) {
			if (err) {
				return callback(err);
			}

			if (body === null) {
				return callback({
					message: "Update: Story not found",
					story: story
				});
			}

			// TODO: Where is the right place to change the appropriate fields?
			// As this stands, this method has to be updated whenever there
			// is a change to the user model.
			story._id = body._id;
			story._rev = body._rev;
			story.type = body.type;

			if (areStoriesEqual(body, story)) {
				// Do nothing
				console.log("Skipping update ...");
				console.log(story);
				callback(null, story);
			}
			else {
				// TODO: Turn this back on.
				// console.log("Updating ...");
				// console.log("From: ");
				// console.log(body);
				// console.log("To: ");
				// console.log(story);

				database.insert(story, function (err, body) {
					if (err) {
						console.log("Error.");
					}
					callback(err, body);
				});	
			}
		});
	};

	var storiesTransaction = function (stories, callback) {

		var startTransaction = function (oldStories, newStories) {
			var transaction = {};
			transaction.id = uuid.v4();
			transaction.docs = [];

			for (var storyIndex in oldStories) {
				var story = oldStories[storyIndex];
				transaction.docs.push({
					id: story._id,
					rev: story._rev
				});				
			}

			for (var storyIndex in newStories) {
				newStories[storyIndex].transaction = transaction;
			}

			var options = {
				"all_or_nothing": true
			};

			var bulkDoc = {};
			bulkDoc.docs = [];
			for (var storyIndex in newStories) {
				bulkDoc.docs.push(newStories[storyIndex]);
			}

			database.bulk(bulkDoc, options, function (err, response) {
				if (err) {
					return callback(err);
				}

				var isConflicted = false;
				for (var docIndex in response) {
					if (!response[docIndex].ok) {
						if (response[docIndex].error === 'conflict') {
							// If we get here, our transaction has failed,
							// because all the docs could not enter into
							// it, and we need to roll back the docs that
							// are now in a transactional state.
							isConflicted = true;
							break;
						}
						else {
							// If we get here, we've failed for some other
							// reason that we don't know how to handle.
							return callback({
								message: "Response not ok.",
								response: response
							});
						}
					}
				}

				if (isConflicted) {
					return callback({
						message: "An open transaction has been left in the database due to conflicts."
					});

					// var docsInTransactionalState = [];
					// for (var docIndex in response) {
					// 	if (response[docIndex].ok) {
					// 		docsInTransactionalState.push(response[docIndex].id);
					// 	}
					// }

					// docsInTransactionalState.forEach(function (doc) {
					// 	var params = {};
					// 	params.rev = initialRevs[doc];
					// 	database.get(doc, params, function (err, body) {
					// 		if (err) {
					// 			// TODO: Callback error
					// 			console.log(err);
					// 			return;	
					// 		}
					// 	});
					// });
				}

				for (var docIndex in response) {
					for (var storyIndex in newStories) {
						if (newStories[storyIndex]._id === response[docIndex].id) {
							newStories[storyIndex]._rev = response[docIndex].rev;
							newStories[storyIndex].transaction = undefined;
							newStories[storyIndex].lastTransactionId = transaction.id;	
						}
					}
				}

				bulkDoc = {};
				bulkDoc.docs = [];
				for (var storyIndex in newStories) {
					bulkDoc.docs.push(newStories[storyIndex]);
				}

				database.bulk(bulkDoc, options, function (err, response) {
					if (err) {
						return callback(err);
					}

					for (var docIndex in response) {
						if (!response[docIndex].ok) {
							return callback({
								message: "Response not ok in reset.",
								response: response
							});
						}
					}

					callback(err, response);
				});
			});
		}; // end startTransaction


		// Do some basic checks before we try anything.
		var storyIds = [];
		var initialStories = [];
		var initialRevs = {};

		for (var storyIndex in stories) {
			var story = stories[storyIndex];
			storyIds.push(story._id);
			initialRevs[story._id] = story._rev;
		}

		var initialQuery = {};
		initialQuery["keys"] = storyIds;

		database.fetch(initialQuery, function (err, body) {
			if (err) {
				return callback(err);
			}

			body.rows.forEach(function (row) {
				initialStories.push(row.doc);
			});

			var hasInitialRevConflict = false;
			initialStories.forEach(function (initialStory) {
				if (initialStory._rev !== initialRevs[initialStory._id]) {
					// This transaction is over before it begins.
					hasInitialRevConflict = true;
				}
			});

			if (hasInitialRevConflict) {
				callback({
					error: "init",
					message: "Not starting transaction; " + 
					         "revisions already behind when function called"
				});
			}
			else {
				startTransaction(initialStories, stories);
			}
		});
	};


	// TODO: Note, this causes the database to be
	// created immediately, which we might not want
	// to necessarily do.
	createDatabaseAndViews(function (err) {
		if (err) {
			console.log(err);
		}
		else {
			// database ready.
			isDatabaseReady = true;
		}
	});

	var whenDatabaseReady = function (callback, timeout) {
		var timeSpent = 0;
		var intervalId = setInterval(function () {
			if (isDatabaseReady) {
				clearInterval(intervalId);
				callback();
			}

			if (timeout && timeSpent > timeout) {
				clearInterval(intervalId);
				callback("Reached timeout before database was ready.")
			}

			timeSpent += 100;
		}, 100);
	};

	return {
		database: {
			whenReady: whenDatabaseReady
		},
		projects: {
			// TODO: Do we want a projects data API?
		},
		settings: {
			add: addSetting,
			get: getSettings,
			getAuthorized: getAuthorizedSettings,
			getPrivate: getPrivateSettings,
			getAll: getAllSettings,
			update: updateSetting
		},
		groups: {
			add: addGroup,
			remove: removeGroup,
			findById: findGroupById,
			findByProjectId: findGroupsByProjectId,
			findByUser: findGroupsByUser
		},
		stories: {
			add: addStory,
			remove: removeStory,
			findMany: findStoriesById,
			findById: findStoryById,
			findByProjectId: findStoriesByProjectId,
			findByNextId: findStoriesByNextId,
			findFirst: findFirstByProjectId,
			findNextMeeting: findNextMeetingByProjectId,
			transaction: storiesTransaction,
			update: updateStory
		},
		archives: {
			add: addArchives,
			findByProjectId: findArchivesByProjectId
		},
		users: {
			add: addUser,
			remove: removeUser,
			findByEmail: findUserByEmail,
			findById: findUserById,
			findByName: findUserByName,
			findMany: findUsersById,
			getAll: getAllUsers,
			update: updateUser,
			updatePassword: updateUserPassword
		},
		passwords: {
			findById: findPasswordById
		}
	}
}();

module.exports = function () {
	return couch;
}(); // closure