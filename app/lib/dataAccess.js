var couch = require('./couch.js');
var encrypt = require('./encrypt.js');

var db = function() {

	var isValidUser = function(user) {
		return user && user.email && user.id;
	}

	var findUserByEmail = function(userEmail, callback) {
		couch.users.findByEmail(userEmail, callback);
	};

	var findUserById = function(id, callback) {
		couch.users.findById(id, callback);
	};

	var addUser = function(user, password, success, failure) {
		if (!isValidUser(user)) {
			return failure("User cannot be null?");
		}

		var addUser = function (user, password) {
			couch.users.add(user, password, function (err, body) {
				if (err) {
					return failure(err);
				}
				success();	
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
		// 	if (!(user && user.email)) {
		// 		// Do nothing. TODO: Do what?
		// 	}
		// 	else if (this.findById(user.id)) {
		// 		// TODO: DO THIS ...
		// 		return success();
		// 	}

		// 	// TODO: Error codes.
		// 	return failure();
	};

	var updateUser = function(user, success, failure) {
		if (!isValidUser(user)) {
			return failure();
		}

		findUserById(user.id, function (err, user) {
			if (err) {
				return failure(err);
			}
			couch.users.update(user, function (err) {
				if (err) {
					return failure(err);
				}
				success();
			});
		});
	};

	var updateUserPassword = function(user, password, success, failure) {
		// 	if (!isValidUser(user) && !this.findById(user.id)) {
		// 		return failure();
		// 	}

		// 	// TODO ...
		// 	// db.users.findById(user.id, function (err, user) {
		// 	// 	if (err || !user) {
		// 	// 		return failure();
		// 	// 	}

		// 	// 	db.passwords.findById(user.id, function (pass) {

		// 	// 	});
		// 	// });

		// 	// var salt = uuid.v4();
		// 	// var hash = hashPassword(password, salt);
		// 	// passwordList[user.id] = { "hash":hash, "salt":salt };

		// 	return success();
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
		users: { 
			add: addUser,
			// remove: removeUser,
			findByEmail: findUserByEmail,
			findById: findUserById, 
			update: updateUser,
			// updatePassword: updateUserPassword,
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
