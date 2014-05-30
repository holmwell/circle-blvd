var LocalDatabase = require('./local-database.js');
var designDocs    = require('./design-docs-couch.js');

var encrypt = require('./encrypt.js');

var couch = function() {
	// TODO: Ideally, we want to make the database automatically
	// if 'circle-blvd' doesn't already exist on first run, and if
	// it does then ask for a new database name. For now, we're
	// letting future selves figure that out.

	var database = LocalDatabase('circle-blvd', designDocs);

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

	var getDoc = function (docId, callback) {
		database.get(docId, callback);
	};

	var getDocs = function (docIds, callback) {
		if (!docIds || docIds.length < 1) {
			return callback(null, null);
		}

		var docsFound = [];
		var query = {};
		query["keys"] = docIds;
		database.fetch(query, function (err, body) {
			if (err) {
				return callback(err);
			}
			else {
				for (var rowIndex in body.rows) {
					docsFound.push(body.rows[rowIndex].doc);
				}
				return callback(null, docsFound);
			}
		});
	};

	var updateDoc = function (doc, callback) {
		database.get(doc._id, function (err, body) {
			if (err) {
				return callback(err);
			}
			doc._rev = body._rev;

			database.insert(doc, function (err, body) {
				if (err) {
					return callback(err);
				}
				doc._rev = body.rev;
				callback(null, doc);
			});
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

	var findUserByEmail = function(email, callback) {
		findOneByKey("users/byEmail", email, callback);
	};

	var findUserById = function(id, callback) {
		findOneByKey("users/byId", id, callback);
	};

	var findUserByCircleAndName = function (circleId, name, callback) {
		if (name) {
			name = name.toLowerCase();
		}
		else {
			return callback(null, undefined);
		}

		// TODO: Re-think this when we get to have millions of members
		// in each circle, for performance reasons.
		findUsersByCircleId(circleId, function (err, usersInCircle) {
			if (err) {
				return callback(err);
			}

			var users = [];
			usersInCircle.forEach(function (inCircle) {
				if (inCircle.name 
					&& inCircle.name.toLowerCase() === name) {
					users.push(inCircle);
				}
			});

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

	var findUsersByCircleId = function (circleId, callback) {
		var options = {
			startkey: [circleId],
			endkey: [circleId, {}],
			reduce: false,
			group: false
		};

		var users = [];
		var uniqueUsers = {};
		getView("users/byCircle", options, function (err, viewUsers) {
			if (err) {
				return callback(err);
			}

			// TODO: It would be neat for CouchDB to give
			// us a unique list of users instead of us doing
			// this hack.
			viewUsers.forEach(function (user) {
				uniqueUsers[user._id] = user;
			});

			for (var key in uniqueUsers) {
				users.push(uniqueUsers[key]);
			}

			callback(null, users);
		});
	};

	var findNamesByCircleId = function (circleId, callback) {
		var options = {
			startkey: [circleId],
			endkey: [circleId, {}],
			group: true
		};
		getView("users/byCircle", options, callback);	
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



	var addCircle = function (circle, callback) {
		circle.type = "circle";
		database.insert(circle, callback);
	};

	var getAllCircles = function (callback) {
		getView("circles/byName", callback);
	};

	var findCirclesByUser = function (user, callback) {
		var circleIds = [];

		for (var membershipKey in user.memberships) {
			var membership = user.memberships[membershipKey];
			circleIds.push(membership.circle);
		}

		getDocs(circleIds, callback);
	};


	var updateCircle = function (circle, callback) {
		var copyCircle = function (source, dest) {
			dest.name = source.name;
		};

		database.get(circle._id, function (err, circleToUpdate) {
			if (err) {
				return callback(err);
			}
			if (circleToUpdate.type !== "circle") {
				return callback({
					message: "Update circle: Attempt to update a non-circle."
				});
			}

			copyCircle(circle, circleToUpdate);
			database.insert(circleToUpdate, function (err, body) {
				if (err) {
					return callback(err);
				}
				circleToUpdate._rev = body.rev;
				return callback(null, circleToUpdate);
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

	var findGroupsByCircleId = function (circleId, callback) {
		var options = {
			key: circleId
		};
		getView("groups/byCircleId", options, function (err, rows) {
			callback(err, rows);
		});
	};

	var findGroupsByUser = function (user, callback) {
		var groupIds = [];

		for (var membershipKey in user.memberships) {
			var membership = user.memberships[membershipKey];
			groupIds.push(membership.group);
		}

		getDocs(groupIds, callback);
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

	var findArchivesByCircleId = function (circleId, callback) {
		var options = {
			startkey: [circleId, {}],
			endkey: [circleId],
			descending: true
		};
		getView("archives/byCircleId", options, function (err, rows) {
			callback(err, rows);
		});
	};


	return {
		findOneByKey: findOneByKey,
		view: getView,
		db: database,
		database: {
			whenReady: database.whenReady
		},
		circles: {
			add: addCircle,
			getAll: getAllCircles,
			findByUser: findCirclesByUser,
			update: updateCircle
		},
		groups: {
			add: addGroup,
			remove: removeGroup,
			findById: findGroupById,
			findByProjectId: findGroupsByCircleId,
			findByUser: findGroupsByUser
		},
		docs: {
			get: getDoc,
			update: updateDoc
		},
		archives: {
			add: addArchives,
			findByCircleId: findArchivesByCircleId
		},
		users: {
			add: addUser,
			remove: removeUser,
			findByCircleId: findUsersByCircleId,
			findNamesByCircleId: findNamesByCircleId,
			findByEmail: findUserByEmail,
			findById: findUserById,
			findByCircleAndName: findUserByCircleAndName,
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