var nano = require('nano');
var views = require('./views.js');
var encrypt = require('./encrypt.js');

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
			
			var docs = [];
			body.rows.forEach(function (doc) {
				docs.push(doc.value);
			});

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
		getView("stories/byNextId", {key: nextId}, callback);
	}

	var n = function(s) {
		return s || "";
	}

	var areStoriesEqual = function (a, b) {
		// TODO: a 'for in' loop
		return n(a.id) === n(b.id)
		&& n(a.type) === n(b.type)
		&& n(a.nextId) === n(b.nextId)
		&& n(a.isFirstStory) === n(b.isFirstStory)
		&& n(a.projectId) === n(b.projectId)
		&& n(a.summary) === n(b.summary);
	};

	var updateStory = function (story, callback) {
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
				console.log("Updating ...");
				console.log("From: ");
				console.log(body);
				console.log("To: ");
				console.log(story);

				database.insert(story, function (err, body) {
					if (err) {
						console.log("Error.");
					}
					callback(err, body);
				});	
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
		}
	});

	return {
		projects: {
			// TODO: Do we want a projects data API?
		},
		stories: {
			add: addStory,
			remove: removeStory,
			findById: findStoryById,
			findByProjectId: findStoriesByProjectId,
			findByNextId: findStoriesByNextId,
			update: updateStory
		},
		users: {
			add: addUser,
			remove: removeUser,
			findByEmail: findUserByEmail,
			findById: findUserById,
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