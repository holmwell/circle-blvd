var uuid    = require('node-uuid');
var encrypt = require('./encrypt.js');

var couch = require('./couch.js');
var things = require('./couch-users.js');
couch.users = things.users;
couch.passwords = things.passwords;

module.exports = function () {

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
	};
}(); // closure