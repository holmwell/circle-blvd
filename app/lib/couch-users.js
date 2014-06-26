var encrypt = require('./encrypt.js');

var couch = require('./couch.js');
var database = couch.db;

module.exports = function () {

	var findUserByEmail = function(email, callback) {
		couch.findOneByKey("users/byEmail", email, callback);
	};

	var findUserById = function(id, callback) {
		couch.findOneByKey("users/byId", id, callback);
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
		couch.view("users/byCircle", options, function (err, viewUsers) {
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



	var findNamesByCircleId = function (circleId, callback) {
		var options = {
			startkey: [circleId],
			endkey: [circleId, {}],
			group: true
		};
		couch.view("users/byCircle", options, callback);	
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
		couch.findOneByKey("passwords/byId", id, callback);
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

			database.insert(user, function (err, body) {
				if (err) {
					if (err.error === 'conflict') {
						// It happens ... try again.
						updateUser(user, callback);
						return;
					}
				}
				callback(err, body);
			});
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
		couch.view("users/byId", function (err, rows) {
			callback(err, rows);
		});
	};

	return {
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
	};
}();